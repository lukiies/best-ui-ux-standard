using Api.Interceptors;
using Api.Models;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Serilog;
using Serilog.Context;

// =============================================================================
// Bootstrap logger (catches startup errors)
// =============================================================================
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // =========================================================================
    // SERILOG
    // =========================================================================
    builder.Host.UseSerilog((context, services, config) =>
    {
        config
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .Enrich.WithMachineName()
            .Enrich.WithThreadId()
            .WriteTo.Console(outputTemplate:
                "[{Timestamp:HH:mm:ss} {Level:u3}] {CorrelationId:l} {Message:lj}{NewLine}{Exception}")
            .WriteTo.Seq(
                context.Configuration["Seq:ServerUrl"] ?? "http://localhost:5341");
    });

    // =========================================================================
    // EF CORE + POSTGRESQL (with DbContext Pooling)
    // =========================================================================
    builder.Services.AddSingleton<SlowQueryInterceptor>();
    builder.Services.AddDbContextPool<AppDbContext>((sp, options) =>
    {
        options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            npgsql =>
            {
                npgsql.EnableRetryOnFailure(3);
                npgsql.CommandTimeout(30);
            });
        options.AddInterceptors(sp.GetRequiredService<SlowQueryInterceptor>());
    }, poolSize: 1024);

    // =========================================================================
    // HYBRID CACHE (In-Memory L1 + Redis L2)
    // =========================================================================
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = builder.Configuration["Redis:ConnectionString"];
    });

    builder.Services.AddHybridCache(options =>
    {
        options.MaximumPayloadBytes = 1024 * 1024; // 1MB max
        options.DefaultEntryOptions = new HybridCacheEntryOptions
        {
            Expiration = TimeSpan.FromMinutes(5),
            LocalCacheExpiration = TimeSpan.FromMinutes(1)
        };
    });

    // =========================================================================
    // OPENTELEMETRY (Metrics + Traces)
    // =========================================================================
    var otelResource = ResourceBuilder.CreateDefault()
        .AddService("mvp-performance-api", serviceVersion: "1.0.0");

    builder.Services.AddOpenTelemetry()
        .WithMetrics(metrics =>
        {
            metrics
                .SetResourceBuilder(otelResource)
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation()
                .AddPrometheusExporter();
        })
        .WithTracing(tracing =>
        {
            tracing
                .SetResourceBuilder(otelResource)
                .AddAspNetCoreInstrumentation(opts =>
                {
                    opts.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/healthz")
                                      && !ctx.Request.Path.StartsWithSegments("/metrics");
                })
                .AddHttpClientInstrumentation()
                .AddEntityFrameworkCoreInstrumentation(opts =>
                {
                    opts.SetDbStatementForText = true;
                })
                .AddOtlpExporter(opts =>
                {
                    opts.Endpoint = new Uri(
                        builder.Configuration["Jaeger:Endpoint"] ?? "http://localhost:4317");
                });
        });

    // =========================================================================
    // HEALTH CHECKS
    // =========================================================================
    builder.Services
        .AddHealthChecks()
        .AddNpgSql(
            builder.Configuration.GetConnectionString("DefaultConnection")!,
            name: "postgresql",
            tags: ["database", "critical"])
        .AddRedis(
            builder.Configuration["Redis:ConnectionString"]!,
            name: "redis",
            tags: ["cache", "critical"]);

    builder.Services
        .AddHealthChecksUI(opts =>
        {
            opts.SetEvaluationTimeInSeconds(30);
            opts.MaximumHistoryEntriesPerEndpoint(100);
            opts.AddHealthCheckEndpoint("API", "/healthz");
        })
        .AddInMemoryStorage();

    // =========================================================================
    // RESPONSE COMPRESSION
    // =========================================================================
    builder.Services.AddResponseCompression(opts =>
    {
        opts.EnableForHttps = true;
    });

    var app = builder.Build();

    // =========================================================================
    // MIDDLEWARE PIPELINE
    // =========================================================================

    // Correlation ID middleware
    app.Use(async (context, next) =>
    {
        var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault()
            ?? context.TraceIdentifier;
        context.Response.Headers["X-Correlation-ID"] = correlationId;
        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await next();
        }
    });

    app.UseSerilogRequestLogging(opts =>
    {
        opts.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
        {
            diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
            diagnosticContext.Set("UserAgent",
                httpContext.Request.Headers.UserAgent.ToString());
        };
    });

    app.UseResponseCompression();

    // =========================================================================
    // HEALTH CHECK ENDPOINTS
    // =========================================================================
    app.MapHealthChecks("/healthz", new HealthCheckOptions
    {
        ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
    });
    app.MapHealthChecks("/healthz/ready", new HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("critical"),
        ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
    });
    app.MapHealthChecks("/healthz/live", new HealthCheckOptions
    {
        Predicate = _ => false // Always healthy if app is running
    });
    app.MapHealthChecksUI(opts => opts.UIPath = "/health-dashboard");

    // Prometheus metrics endpoint
    app.MapPrometheusScrapingEndpoint("/metrics");

    // =========================================================================
    // API ENDPOINTS
    // =========================================================================

    // --- Products ---
    app.MapGet("/api/products", async (
        AppDbContext db,
        HybridCache cache,
        int page = 1,
        int limit = 20,
        string? category = null) =>
    {
        var cacheKey = $"products:page:{page}:limit:{limit}:cat:{category ?? "all"}";

        var result = await cache.GetOrCreateAsync(cacheKey, async ct =>
        {
            var query = db.Products.AsNoTracking();
            if (!string.IsNullOrEmpty(category))
                query = query.Where(p => p.Category == category);

            var total = await query.CountAsync(ct);
            var items = await query
                .OrderBy(p => p.Name)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync(ct);

            return new { data = items, pagination = new { page, limit, total } };
        },
        tags: ["products"]);

        return Results.Ok(result);
    });

    app.MapGet("/api/products/{id:int}", async (
        int id,
        AppDbContext db,
        HybridCache cache) =>
    {
        var product = await cache.GetOrCreateAsync(
            $"product:{id}",
            async ct => await db.Products.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id, ct),
            tags: ["products"]);

        return product is not null ? Results.Ok(product) : Results.NotFound();
    });

    // --- Orders ---
    app.MapGet("/api/orders", async (
        AppDbContext db,
        int page = 1,
        int limit = 20,
        string? status = null) =>
    {
        var query = db.Orders
            .AsNoTracking()
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .AsSplitQuery();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.Status == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Results.Ok(new { data = items, pagination = new { page, limit, total } });
    });

    app.MapGet("/api/orders/{id:int}", async (int id, AppDbContext db) =>
    {
        var order = await db.Orders
            .AsNoTracking()
            .Include(o => o.Customer)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .AsSplitQuery()
            .FirstOrDefaultAsync(o => o.Id == id);

        return order is not null ? Results.Ok(order) : Results.NotFound();
    });

    // --- Customers ---
    app.MapGet("/api/customers", async (AppDbContext db, int page = 1, int limit = 20) =>
    {
        var total = await db.Customers.CountAsync();
        var items = await db.Customers
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Results.Ok(new { data = items, pagination = new { page, limit, total } });
    });

    // --- Stats (for dashboard/monitoring demo) ---
    app.MapGet("/api/stats", async (AppDbContext db, HybridCache cache) =>
    {
        var stats = await cache.GetOrCreateAsync("dashboard:stats", async ct =>
        {
            var productCount = await db.Products.CountAsync(ct);
            var orderCount = await db.Orders.CountAsync(ct);
            var customerCount = await db.Customers.CountAsync(ct);
            var revenue = await db.Orders
                .Where(o => o.Status == "completed")
                .SumAsync(o => o.Total, ct);

            return new
            {
                products = productCount,
                orders = orderCount,
                customers = customerCount,
                revenue,
                timestamp = DateTime.UtcNow
            };
        },
        new HybridCacheEntryOptions
        {
            Expiration = TimeSpan.FromMinutes(1),
            LocalCacheExpiration = TimeSpan.FromSeconds(30)
        },
        tags: ["stats"]);

        return Results.Ok(stats);
    });

    // --- Ensure DB and seed data ---
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();

        if (!await db.Products.AnyAsync())
        {
            Log.Information("Seeding database with sample data...");
            await SeedData.SeedAsync(db);
            Log.Information("Database seeded successfully.");
        }
    }

    Log.Information("MVP Performance API started. Listening on port 8080.");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// =============================================================================
// SEED DATA
// =============================================================================
static class SeedData
{
    public static async Task SeedAsync(AppDbContext db)
    {
        var categories = new[] { "Electronics", "Clothing", "Books", "Food", "Tools" };
        var statuses = new[] { "pending", "processing", "completed", "cancelled" };
        var rng = new Random(42);

        // Seed 500 products
        var products = new List<Product>();
        for (int i = 1; i <= 500; i++)
        {
            products.Add(new Product
            {
                Name = $"Product {i:D4}",
                Sku = $"SKU-{i:D6}",
                Category = categories[rng.Next(categories.Length)],
                Price = Math.Round((decimal)(rng.NextDouble() * 500 + 1), 2),
                StockQuantity = rng.Next(0, 1000),
                Description = $"Description for product {i}. High-quality item.",
                CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(0, 365)),
                UpdatedAt = DateTime.UtcNow
            });
        }
        db.Products.AddRange(products);
        await db.SaveChangesAsync();

        // Seed 200 customers
        var customers = new List<Customer>();
        for (int i = 1; i <= 200; i++)
        {
            customers.Add(new Customer
            {
                Name = $"Customer {i}",
                Email = $"customer{i}@example.com",
                Company = $"Company {(i % 50) + 1} Ltd",
                CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(0, 730))
            });
        }
        db.Customers.AddRange(customers);
        await db.SaveChangesAsync();

        // Seed 1000 orders with items
        for (int i = 1; i <= 1000; i++)
        {
            var itemCount = rng.Next(1, 6);
            var order = new Order
            {
                CustomerId = customers[rng.Next(customers.Count)].Id,
                Status = statuses[rng.Next(statuses.Length)],
                CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(0, 365)),
                Items = new List<OrderItem>()
            };

            decimal total = 0;
            for (int j = 0; j < itemCount; j++)
            {
                var product = products[rng.Next(products.Count)];
                var qty = rng.Next(1, 10);
                order.Items.Add(new OrderItem
                {
                    ProductId = product.Id,
                    Quantity = qty,
                    UnitPrice = product.Price
                });
                total += product.Price * qty;
            }
            order.Total = Math.Round(total, 2);
            db.Orders.Add(order);

            // Batch save every 100 orders
            if (i % 100 == 0)
                await db.SaveChangesAsync();
        }
        await db.SaveChangesAsync();
    }
}
