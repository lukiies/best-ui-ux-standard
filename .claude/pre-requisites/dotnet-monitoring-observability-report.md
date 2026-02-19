# .NET/EF Core Monitoring & Observability Report

**Status:** RESEARCHED | **Date:** February 2026
**Scope:** ASP.NET Core 8/9, EF Core, PostgreSQL, Redis — dedicated/bare-metal servers
**Companion docs:** [dotnet-efcore-scalability-report](dotnet-efcore-scalability-report.md), [dotnet-load-testing-performance-report](dotnet-load-testing-performance-report.md)

---

## Table of Contents

1. [Overview & Pillars](#1-overview--pillars)
2. [OpenTelemetry Setup for .NET](#2-opentelemetry-setup-for-net)
3. [Serilog Configuration (Multi-Sink)](#3-serilog-configuration-multi-sink)
4. [Correlation ID Middleware](#4-correlation-id-middleware)
5. [Slow Query Interceptor for EF Core](#5-slow-query-interceptor-for-ef-core)
6. [Health Checks with UI Dashboard](#6-health-checks-with-ui-dashboard)
7. [Monitoring Stack: Prometheus + Grafana + Jaeger](#7-monitoring-stack-prometheus--grafana--jaeger)
8. [Infrastructure Monitoring (Exporters)](#8-infrastructure-monitoring-exporters)
9. [Key Metrics & PromQL Queries](#9-key-metrics--promql-queries)
10. [Alerting Rules (Prometheus)](#10-alerting-rules-prometheus)
11. [Alertmanager Configuration](#11-alertmanager-configuration)
12. [Real User Monitoring (RUM)](#12-real-user-monitoring-rum)
13. [Deployment Order](#13-deployment-order)
14. [Summary & Recommendations](#14-summary--recommendations)

---

## 1. Overview & Pillars

Production monitoring rests on three pillars of observability:

| Pillar | Tool | Purpose |
|--------|------|---------|
| **Traces** | OpenTelemetry + Jaeger | Follow a request across services, identify latency bottlenecks |
| **Metrics** | OpenTelemetry + Prometheus + Grafana | Time-series numeric data: request rates, error rates, durations, system resources |
| **Logs** | Serilog + Seq/Elasticsearch | Structured events with full context, searchable, correlated to traces |

All three must be **correlated** via TraceId/SpanId/CorrelationId so you can jump from a Grafana alert to the exact Jaeger trace to the exact Seq log entries.

---

## 2. OpenTelemetry Setup for .NET

### 2.1 NuGet Packages

```xml
<!-- Core OTEL -->
<PackageReference Include="OpenTelemetry" Version="1.11.*" />
<PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.11.*" />

<!-- Instrumentation -->
<PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" Version="1.11.*" />
<PackageReference Include="OpenTelemetry.Instrumentation.Http" Version="1.11.*" />
<PackageReference Include="OpenTelemetry.Instrumentation.EntityFrameworkCore" Version="1.0.0-beta.*" />
<PackageReference Include="OpenTelemetry.Instrumentation.Runtime" Version="1.11.*" />
<PackageReference Include="OpenTelemetry.Instrumentation.Process" Version="0.5.*-beta" />

<!-- Exporters -->
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.11.*" />
<PackageReference Include="OpenTelemetry.Exporter.Prometheus.AspNetCore" Version="1.11.*-beta" />
```

### 2.2 Program.cs Configuration (ASP.NET Core 8/9)

```csharp
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Logs;

var builder = WebApplication.CreateBuilder(args);

var serviceName = "MyApp.Api";
var serviceVersion = "1.0.0";

// Define the OTEL resource (identifies this service)
var resourceBuilder = ResourceBuilder.CreateDefault()
    .AddService(serviceName: serviceName, serviceVersion: serviceVersion)
    .AddAttributes(new Dictionary<string, object>
    {
        ["deployment.environment"] = builder.Environment.EnvironmentName,
        ["host.name"] = Environment.MachineName
    });

// ── TRACING ──
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .SetResourceBuilder(resourceBuilder)
            .AddAspNetCoreInstrumentation(opts =>
            {
                opts.RecordException = true;
                opts.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/health");
            })
            .AddHttpClientInstrumentation(opts =>
            {
                opts.RecordException = true;
            })
            .AddEntityFrameworkCoreInstrumentation(opts =>
            {
                opts.SetDbStatementForText = true; // WARNING: may log param values
            })
            .AddSource("MyApp.*") // custom ActivitySources
            .AddOtlpExporter(opts =>
            {
                opts.Endpoint = new Uri("http://jaeger:4317");
                opts.Protocol = OpenTelemetry.Exporter.OtlpExportProtocol.Grpc;
            });
    })
    // ── METRICS ──
    .WithMetrics(metrics =>
    {
        metrics
            .SetResourceBuilder(resourceBuilder)
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation()  // GC, thread pool, etc.
            .AddProcessInstrumentation()  // CPU, memory
            .AddMeter("MyApp.*")          // custom meters
            .AddPrometheusExporter();     // /metrics endpoint
    });

// ── LOGGING (OTEL bridge) ──
builder.Logging.AddOpenTelemetry(logging =>
{
    logging
        .SetResourceBuilder(resourceBuilder)
        .AddOtlpExporter(opts =>
        {
            opts.Endpoint = new Uri("http://otel-collector:4317");
        });
});

var app = builder.Build();

// Expose /metrics for Prometheus scraping
app.MapPrometheusScrapingEndpoint();

app.Run();
```

### 2.3 Custom Metrics Example

```csharp
using System.Diagnostics;
using System.Diagnostics.Metrics;

public static class AppTelemetry
{
    public static readonly ActivitySource ActivitySource = new("MyApp.Api");
    public static readonly Meter Meter = new("MyApp.Api", "1.0.0");

    // Counters
    public static readonly Counter<long> OrdersCreated =
        Meter.CreateCounter<long>("app.orders.created", "orders", "Total orders created");

    public static readonly Counter<long> OrdersFailed =
        Meter.CreateCounter<long>("app.orders.failed", "orders", "Failed order attempts");

    // Histograms
    public static readonly Histogram<double> OrderProcessingDuration =
        Meter.CreateHistogram<double>(
            "app.orders.processing_duration",
            "ms",
            "Time to process an order");
}

// Usage in a service:
public class OrderService
{
    public async Task<Order> CreateOrderAsync(CreateOrderDto dto)
    {
        using var activity = AppTelemetry.ActivitySource.StartActivity("CreateOrder");
        activity?.SetTag("order.customer_id", dto.CustomerId);

        var sw = Stopwatch.StartNew();
        try
        {
            var order = await _repository.CreateAsync(dto);
            AppTelemetry.OrdersCreated.Add(1, new("order.type", dto.Type));
            activity?.SetTag("order.id", order.Id);
            return order;
        }
        catch (Exception ex)
        {
            AppTelemetry.OrdersFailed.Add(1, new("error.type", ex.GetType().Name));
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
        finally
        {
            sw.Stop();
            AppTelemetry.OrderProcessingDuration.Record(sw.Elapsed.TotalMilliseconds);
        }
    }
}
```

---

## 3. Serilog Configuration (Multi-Sink)

### 3.1 NuGet Packages

```xml
<PackageReference Include="Serilog.AspNetCore" Version="8.*" />
<PackageReference Include="Serilog.Enrichers.Environment" Version="3.*" />
<PackageReference Include="Serilog.Enrichers.Thread" Version="4.*" />
<PackageReference Include="Serilog.Enrichers.Span" Version="3.*" />
<PackageReference Include="Serilog.Sinks.Console" Version="6.*" />
<PackageReference Include="Serilog.Sinks.File" Version="6.*" />
<PackageReference Include="Serilog.Sinks.Seq" Version="8.*" />
<PackageReference Include="Serilog.Sinks.Elasticsearch" Version="10.*" />
```

### 3.2 appsettings.json

```json
{
  "Serilog": {
    "Using": [
      "Serilog.Sinks.Console",
      "Serilog.Sinks.File",
      "Serilog.Sinks.Seq",
      "Serilog.Sinks.Elasticsearch"
    ],
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft.AspNetCore": "Warning",
        "Microsoft.EntityFrameworkCore.Database.Command": "Information",
        "System.Net.Http.HttpClient": "Warning"
      }
    },
    "Enrich": [
      "FromLogContext",
      "WithMachineName",
      "WithThreadId",
      "WithSpanId",
      "WithTraceId"
    ],
    "Properties": {
      "Application": "MyApp.Api",
      "Environment": "Production"
    },
    "WriteTo": [
      {
        "Name": "Console",
        "Args": {
          "outputTemplate": "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}"
        }
      },
      {
        "Name": "File",
        "Args": {
          "path": "/var/log/myapp/app-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 30,
          "fileSizeLimitBytes": 104857600,
          "outputTemplate": "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] [{TraceId}] [{SpanId}] {Message:lj}{NewLine}{Exception}"
        }
      },
      {
        "Name": "Seq",
        "Args": {
          "serverUrl": "http://seq:5341",
          "apiKey": "${SEQ_API_KEY}"
        }
      },
      {
        "Name": "Elasticsearch",
        "Args": {
          "nodeUris": "http://elasticsearch:9200",
          "indexFormat": "myapp-logs-{0:yyyy.MM.dd}",
          "autoRegisterTemplate": true,
          "autoRegisterTemplateVersion": "ESv7",
          "batchPostingLimit": 50,
          "period": "2"
        }
      }
    ]
  }
}
```

### 3.3 Program.cs Integration

```csharp
using Serilog;

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();

try
{
    builder.Host.UseSerilog();

    // ... rest of builder config ...

    var app = builder.Build();

    // Request logging middleware (structured, with timing)
    app.UseSerilogRequestLogging(opts =>
    {
        opts.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
        {
            diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
            diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.ToString());
            diagnosticContext.Set("ClientIP", httpContext.Connection.RemoteIpAddress?.ToString());
        };
        opts.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000}ms";
    });

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
```

---

## 4. Correlation ID Middleware

Ensures every request carries a unique CorrelationId propagated through all services, logs, and traces.

```csharp
public class CorrelationIdMiddleware
{
    private const string CorrelationIdHeader = "X-Correlation-Id";
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // Extract or generate correlation ID
        if (!context.Request.Headers.TryGetValue(CorrelationIdHeader, out var correlationId)
            || string.IsNullOrWhiteSpace(correlationId))
        {
            correlationId = Guid.NewGuid().ToString("N");
        }

        // Set it on the response header
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[CorrelationIdHeader] = correlationId.ToString();
            return Task.CompletedTask;
        });

        // Push into Serilog LogContext and Activity baggage
        using (Serilog.Context.LogContext.PushProperty("CorrelationId", correlationId.ToString()))
        {
            System.Diagnostics.Activity.Current?.SetBaggage("correlation.id", correlationId.ToString());
            await _next(context);
        }
    }
}

// Register early in the pipeline:
app.UseMiddleware<CorrelationIdMiddleware>();
```

**HttpClient propagation** — register a DelegatingHandler to forward the header:

```csharp
public class CorrelationIdHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CorrelationIdHandler(IHttpContextAccessor httpContextAccessor)
        => _httpContextAccessor = httpContextAccessor;

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (_httpContextAccessor.HttpContext?.Request.Headers
            .TryGetValue("X-Correlation-Id", out var correlationId) == true)
        {
            request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId.ToString());
        }
        return base.SendAsync(request, cancellationToken);
    }
}

// Registration:
builder.Services.AddTransient<CorrelationIdHandler>();
builder.Services.AddHttpClient("downstream")
    .AddHttpMessageHandler<CorrelationIdHandler>();
```

---

## 5. Slow Query Interceptor for EF Core

Catches queries exceeding a threshold and logs them with full SQL and execution time.

```csharp
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;
using System.Diagnostics;

public class SlowQueryInterceptor : DbCommandInterceptor
{
    private readonly ILogger<SlowQueryInterceptor> _logger;
    private readonly TimeSpan _threshold;

    public SlowQueryInterceptor(ILogger<SlowQueryInterceptor> logger, TimeSpan? threshold = null)
    {
        _logger = logger;
        _threshold = threshold ?? TimeSpan.FromMilliseconds(200);
    }

    public override DbDataReader ReaderExecuted(
        DbCommand command, CommandExecutedEventData eventData, DbDataReader result)
    {
        LogIfSlow(command, eventData.Duration);
        return result;
    }

    public override ValueTask<DbDataReader> ReaderExecutedAsync(
        DbCommand command, CommandExecutedEventData eventData,
        DbDataReader result, CancellationToken ct = default)
    {
        LogIfSlow(command, eventData.Duration);
        return ValueTask.FromResult(result);
    }

    public override int NonQueryExecuted(
        DbCommand command, CommandExecutedEventData eventData, int result)
    {
        LogIfSlow(command, eventData.Duration);
        return result;
    }

    public override object? ScalarExecuted(
        DbCommand command, CommandExecutedEventData eventData, object? result)
    {
        LogIfSlow(command, eventData.Duration);
        return result;
    }

    private void LogIfSlow(DbCommand command, TimeSpan duration)
    {
        if (duration >= _threshold)
        {
            _logger.LogWarning(
                "Slow query detected ({Duration}ms): {CommandText}",
                duration.TotalMilliseconds,
                command.CommandText);

            // Also record as a custom metric
            Activity.Current?.AddEvent(new ActivityEvent("slow_query", tags:
                new ActivityTagsCollection
                {
                    { "db.statement", command.CommandText },
                    { "db.duration_ms", duration.TotalMilliseconds }
                }));
        }
    }
}

// Register in DbContext:
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    options.UseNpgsql(connectionString);
    options.AddInterceptors(
        sp.GetRequiredService<SlowQueryInterceptor>());
});

builder.Services.AddSingleton(sp =>
    new SlowQueryInterceptor(
        sp.GetRequiredService<ILogger<SlowQueryInterceptor>>(),
        threshold: TimeSpan.FromMilliseconds(200)));
```

---

## 6. Health Checks with UI Dashboard

### 6.1 NuGet Packages

```xml
<PackageReference Include="AspNetCore.HealthChecks.NpgSql" Version="8.*" />
<PackageReference Include="AspNetCore.HealthChecks.Redis" Version="8.*" />
<PackageReference Include="AspNetCore.HealthChecks.UI" Version="8.*" />
<PackageReference Include="AspNetCore.HealthChecks.UI.Client" Version="8.*" />
<PackageReference Include="AspNetCore.HealthChecks.UI.InMemory.Storage" Version="8.*" />
<PackageReference Include="AspNetCore.HealthChecks.Uris" Version="8.*" />
```

### 6.2 Configuration

```csharp
builder.Services.AddHealthChecks()
    .AddNpgSql(
        connectionString: builder.Configuration.GetConnectionString("Default")!,
        name: "postgresql",
        tags: ["db", "critical"])
    .AddRedis(
        redisConnectionString: builder.Configuration["Redis:ConnectionString"]!,
        name: "redis",
        tags: ["cache", "critical"])
    .AddUrlGroup(
        new Uri("http://jaeger:14269/"),    // Jaeger health
        name: "jaeger",
        tags: ["tracing"])
    .AddUrlGroup(
        new Uri("http://seq:5341/api"),     // Seq health
        name: "seq",
        tags: ["logging"])
    .AddCheck<DiskSpaceHealthCheck>("disk-space", tags: ["infra"])
    .AddCheck<MemoryHealthCheck>("memory", tags: ["infra"]);

// Health Check UI
builder.Services.AddHealthChecksUI(setup =>
{
    setup.SetEvaluationTimeInSeconds(30);
    setup.MaximumHistoryEntriesPerEndpoint(100);
    setup.AddHealthCheckEndpoint("API", "/health");
}).AddInMemoryStorage();

// Map endpoints
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse,
    Predicate = _ => true
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("critical")
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false // just confirms app is running
});

app.MapHealthChecksUI(opts =>
{
    opts.UIPath = "/health-ui";
});
```

### 6.3 Custom Health Checks

```csharp
public class DiskSpaceHealthCheck : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        var drive = new DriveInfo("/");
        var freePercent = (double)drive.AvailableFreeSpace / drive.TotalSize * 100;

        return Task.FromResult(freePercent switch
        {
            < 5 => HealthCheckResult.Unhealthy($"Disk space critical: {freePercent:F1}%"),
            < 15 => HealthCheckResult.Degraded($"Disk space low: {freePercent:F1}%"),
            _ => HealthCheckResult.Healthy($"Disk space OK: {freePercent:F1}%")
        });
    }
}

public class MemoryHealthCheck : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        var allocated = GC.GetTotalMemory(forceFullCollection: false);
        var allocatedMb = allocated / 1024.0 / 1024.0;
        var threshold = 1500; // MB

        return Task.FromResult(allocatedMb > threshold
            ? HealthCheckResult.Degraded($"Memory usage high: {allocatedMb:F0}MB")
            : HealthCheckResult.Healthy($"Memory OK: {allocatedMb:F0}MB"));
    }
}
```

---

## 7. Monitoring Stack: Prometheus + Grafana + Jaeger

### 7.1 docker-compose.monitoring.yml

```yaml
version: "3.8"

services:
  # ── Prometheus ──
  prometheus:
    image: prom/prometheus:v2.53.0
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./monitoring/prometheus/alert-rules.yml:/etc/prometheus/alert-rules.yml:ro
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.retention.time=30d"
      - "--storage.tsdb.retention.size=10GB"
      - "--web.enable-lifecycle"           # allows /-/reload
      - "--web.enable-admin-api"
    networks:
      - monitoring

  # ── Grafana ──
  grafana:
    image: grafana/grafana:11.4.0
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: "${GRAFANA_PASSWORD:-changeme}"
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
    depends_on:
      - prometheus
    networks:
      - monitoring

  # ── Jaeger (All-in-one for dev/staging; use collector+query+cassandra for prod) ──
  jaeger:
    image: jaegertracing/all-in-one:1.64
    container_name: jaeger
    restart: unless-stopped
    ports:
      - "16686:16686"  # Jaeger UI
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
      - "14269:14269"  # Health check
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
      SPAN_STORAGE_TYPE: badger            # embedded storage for small deployments
      BADGER_EPHEMERAL: "false"
      BADGER_DIRECTORY_VALUE: /badger/data
      BADGER_DIRECTORY_KEY: /badger/key
    volumes:
      - jaeger-data:/badger
    networks:
      - monitoring

  # ── Alertmanager ──
  alertmanager:
    image: prom/alertmanager:v0.27.0
    container_name: alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
    command:
      - "--config.file=/etc/alertmanager/alertmanager.yml"
      - "--storage.path=/alertmanager"
    networks:
      - monitoring

  # ── Seq (structured log viewer) ──
  seq:
    image: datalust/seq:2024.3
    container_name: seq
    restart: unless-stopped
    ports:
      - "5341:5341"  # Ingestion
      - "8081:80"    # UI
    environment:
      ACCEPT_EULA: "Y"
    volumes:
      - seq-data:/data
    networks:
      - monitoring

volumes:
  prometheus-data:
  grafana-data:
  jaeger-data:
  seq-data:

networks:
  monitoring:
    driver: bridge
```

### 7.2 Prometheus Configuration

**monitoring/prometheus/prometheus.yml**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

rule_files:
  - "alert-rules.yml"

scrape_configs:
  # ── .NET Application ──
  - job_name: "dotnet-api"
    scrape_interval: 10s
    static_configs:
      - targets: ["host.docker.internal:5000"]
        labels:
          app: "myapp-api"
          environment: "production"

  # ── Node Exporter (host OS metrics) ──
  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]

  # ── PostgreSQL Exporter ──
  - job_name: "postgres"
    static_configs:
      - targets: ["postgres-exporter:9187"]
        labels:
          db: "primary"

  # ── Redis Exporter ──
  - job_name: "redis"
    static_configs:
      - targets: ["redis-exporter:9121"]

  # ── Prometheus self-monitoring ──
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]
```

### 7.3 Grafana Provisioning

**monitoring/grafana/provisioning/datasources/datasources.yml**

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: false
```

---

## 8. Infrastructure Monitoring (Exporters)

Add these services to your docker-compose.monitoring.yml:

```yaml
  # ── Node Exporter (host metrics: CPU, memory, disk, network) ──
  node-exporter:
    image: prom/node-exporter:v1.8.2
    container_name: node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - "--path.procfs=/host/proc"
      - "--path.sysfs=/host/sys"
      - "--path.rootfs=/rootfs"
      - "--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)"
    networks:
      - monitoring

  # ── PostgreSQL Exporter ──
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:v0.16.0
    container_name: postgres-exporter
    restart: unless-stopped
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: "postgresql://monitor:${PG_MONITOR_PASSWORD}@db:5432/myapp?sslmode=disable"
    networks:
      - monitoring

  # ── Redis Exporter ──
  redis-exporter:
    image: oliver006/redis_exporter:v1.66.0
    container_name: redis-exporter
    restart: unless-stopped
    ports:
      - "9121:9121"
    environment:
      REDIS_ADDR: "redis://redis:6379"
      REDIS_PASSWORD: "${REDIS_PASSWORD}"
    networks:
      - monitoring
```

**PostgreSQL monitor role** (run once on the database):

```sql
CREATE ROLE monitor WITH LOGIN PASSWORD 'secure_password';
GRANT pg_monitor TO monitor;
GRANT CONNECT ON DATABASE myapp TO monitor;
```

---

## 9. Key Metrics & PromQL Queries

### 9.1 Request Rate & Latency (from ASP.NET Core OTEL metrics)

```promql
# Request rate (per second)
rate(http_server_request_duration_seconds_count{job="dotnet-api"}[5m])

# Error rate (5xx responses)
rate(http_server_request_duration_seconds_count{
  job="dotnet-api", http_response_status_code=~"5.."}[5m])
/ rate(http_server_request_duration_seconds_count{job="dotnet-api"}[5m])

# P50 latency
histogram_quantile(0.50,
  rate(http_server_request_duration_seconds_bucket{job="dotnet-api"}[5m]))

# P95 latency
histogram_quantile(0.95,
  rate(http_server_request_duration_seconds_bucket{job="dotnet-api"}[5m]))

# P99 latency
histogram_quantile(0.99,
  rate(http_server_request_duration_seconds_bucket{job="dotnet-api"}[5m]))
```

### 9.2 .NET Runtime Metrics

```promql
# GC heap size (bytes)
process_runtime_dotnet_gc_heap_size_bytes{job="dotnet-api"}

# GC collection count by generation
rate(process_runtime_dotnet_gc_collections_count_total{job="dotnet-api"}[5m])

# GC pause duration (seconds)
rate(process_runtime_dotnet_gc_pause_duration_seconds_total{job="dotnet-api"}[5m])

# ThreadPool threads
process_runtime_dotnet_thread_pool_threads_count{job="dotnet-api"}

# ThreadPool queue length (starvation indicator)
process_runtime_dotnet_thread_pool_queue_length{job="dotnet-api"}

# Process CPU time
rate(process_cpu_time_seconds_total{job="dotnet-api"}[5m])

# Process memory (resident set)
process_resident_memory_bytes{job="dotnet-api"}
```

### 9.3 Database Metrics

```promql
# Active PostgreSQL connections
pg_stat_activity_count{state="active"}

# PostgreSQL replication lag (seconds)
pg_replication_lag_seconds

# Connection pool utilization
pg_stat_activity_count / pg_settings_max_connections * 100

# Slow queries (if custom metric exported)
rate(pg_stat_statements_mean_exec_time_seconds{quantile="0.95"}[5m])
```

### 9.4 Infrastructure Metrics

```promql
# CPU usage (%)
100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage (%)
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage (%)
(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100

# Disk I/O utilization
rate(node_disk_io_time_seconds_total[5m])

# Network traffic (bytes/sec)
rate(node_network_receive_bytes_total{device="eth0"}[5m])
```

---

## 10. Alerting Rules (Prometheus)

**monitoring/prometheus/alert-rules.yml**

```yaml
groups:
  # ── Application Alerts ──
  - name: application
    rules:
      - alert: HighErrorRate
        expr: |
          (
            rate(http_server_request_duration_seconds_count{http_response_status_code=~"5.."}[5m])
            / rate(http_server_request_duration_seconds_count[5m])
          ) > 0.05
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate on {{ $labels.instance }}"
          description: "5xx error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
          runbook_url: "https://wiki.internal/runbooks/high-error-rate"

      - alert: HighLatencyP95
        expr: |
          histogram_quantile(0.95,
            rate(http_server_request_duration_seconds_bucket[5m])
          ) > 1.0
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "P95 latency above 1s on {{ $labels.instance }}"
          description: "P95 latency is {{ $value | humanizeDuration }}"

      - alert: HighLatencyP99
        expr: |
          histogram_quantile(0.99,
            rate(http_server_request_duration_seconds_bucket[5m])
          ) > 3.0
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "P99 latency above 3s on {{ $labels.instance }}"
          description: "P99 latency is {{ $value | humanizeDuration }}"

  # ── .NET Runtime Alerts ──
  - name: dotnet-runtime
    rules:
      - alert: GCPausesTooHigh
        expr: |
          rate(process_runtime_dotnet_gc_pause_duration_seconds_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "GC pauses consuming >5% CPU time on {{ $labels.instance }}"
          description: "GC pause rate: {{ $value }}s per second"

      - alert: ThreadPoolStarvation
        expr: |
          process_runtime_dotnet_thread_pool_queue_length{job="dotnet-api"} > 10
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "Thread pool starvation detected on {{ $labels.instance }}"
          description: "Queue length: {{ $value }}. Work items are waiting for threads."

      - alert: HighMemoryUsage
        expr: |
          process_resident_memory_bytes{job="dotnet-api"} > 2e9
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Process memory above 2GB on {{ $labels.instance }}"
          description: "Resident memory: {{ $value | humanize1024 }}B"

  # ── Infrastructure Alerts ──
  - name: infrastructure
    rules:
      - alert: HighCPUUsage
        expr: |
          100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 10m
        labels:
          severity: warning
          team: infra
        annotations:
          summary: "CPU usage above 85% on {{ $labels.instance }}"
          description: "Current CPU usage: {{ $value | printf \"%.1f\" }}%"

      - alert: CriticalCPUUsage
        expr: |
          100 - (avg by(instance)(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 95
        for: 5m
        labels:
          severity: critical
          team: infra
        annotations:
          summary: "CPU usage above 95% on {{ $labels.instance }}"

      - alert: HighMemoryUsageHost
        expr: |
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: warning
          team: infra
        annotations:
          summary: "Host memory usage above 90% on {{ $labels.instance }}"
          description: "Memory usage: {{ $value | printf \"%.1f\" }}%"

      - alert: DiskSpaceRunningLow
        expr: |
          (1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100 > 85
        for: 10m
        labels:
          severity: warning
          team: infra
        annotations:
          summary: "Disk usage above 85% on {{ $labels.instance }}"

      - alert: DiskSpaceCritical
        expr: |
          (1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100 > 95
        for: 5m
        labels:
          severity: critical
          team: infra
        annotations:
          summary: "Disk usage above 95% on {{ $labels.instance }} — IMMEDIATE ACTION REQUIRED"

  # ── Database Alerts ──
  - name: database
    rules:
      - alert: PostgreSQLConnectionsHigh
        expr: |
          pg_stat_activity_count > (pg_settings_max_connections * 0.8)
        for: 5m
        labels:
          severity: warning
          team: dba
        annotations:
          summary: "PostgreSQL connections above 80% capacity"
          description: "Active connections: {{ $value }}"

      - alert: PostgreSQLConnectionsExhausted
        expr: |
          pg_stat_activity_count > (pg_settings_max_connections * 0.95)
        for: 1m
        labels:
          severity: critical
          team: dba
        annotations:
          summary: "PostgreSQL connections nearly exhausted (>95%)"

      - alert: PostgreSQLReplicationLag
        expr: |
          pg_replication_lag_seconds > 30
        for: 5m
        labels:
          severity: warning
          team: dba
        annotations:
          summary: "PostgreSQL replication lag above 30s"
          description: "Lag: {{ $value | humanizeDuration }}"

      - alert: PostgreSQLReplicationLagCritical
        expr: |
          pg_replication_lag_seconds > 120
        for: 2m
        labels:
          severity: critical
          team: dba
        annotations:
          summary: "PostgreSQL replication lag above 2min — reads may be stale"

      - alert: RedisHighMemory
        expr: |
          redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 5m
        labels:
          severity: warning
          team: dba
        annotations:
          summary: "Redis memory usage above 85%"
```

---

## 11. Alertmanager Configuration

**monitoring/alertmanager/alertmanager.yml**

```yaml
global:
  resolve_timeout: 5m
  pagerduty_url: "https://events.pagerduty.com/v2/enqueue"
  opsgenie_api_url: "https://api.opsgenie.com/"

route:
  receiver: "default-slack"
  group_by: ["alertname", "team", "severity"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    # Critical alerts → PagerDuty (24/7 on-call)
    - match:
        severity: critical
      receiver: "pagerduty-critical"
      group_wait: 10s
      repeat_interval: 1h

    # Warning alerts → OpsGenie (business hours)
    - match:
        severity: warning
      receiver: "opsgenie-warning"
      repeat_interval: 4h

    # DBA team alerts → dedicated channel
    - match:
        team: dba
      receiver: "dba-opsgenie"
      repeat_interval: 2h

receivers:
  # Default fallback
  - name: "default-slack"
    slack_configs:
      - api_url: "${SLACK_WEBHOOK_URL}"
        channel: "#alerts-monitoring"
        title: '{{ .GroupLabels.alertname }}'
        text: >-
          {{ range .Alerts }}
            *{{ .Labels.severity | toUpper }}* - {{ .Annotations.summary }}
            {{ .Annotations.description }}
          {{ end }}
        send_resolved: true

  # PagerDuty for critical alerts
  - name: "pagerduty-critical"
    pagerduty_configs:
      - service_key: "${PAGERDUTY_SERVICE_KEY}"
        severity: '{{ if eq .CommonLabels.severity "critical" }}critical{{ else }}warning{{ end }}'
        description: "{{ .CommonAnnotations.summary }}"
        details:
          firing: "{{ .Alerts.Firing | len }}"
          resolved: "{{ .Alerts.Resolved | len }}"
          instances: "{{ .CommonLabels.instance }}"

  # OpsGenie for warnings
  - name: "opsgenie-warning"
    opsgenie_configs:
      - api_key: "${OPSGENIE_API_KEY}"
        message: "{{ .CommonAnnotations.summary }}"
        priority: '{{ if eq .CommonLabels.severity "critical" }}P1{{ else }}P3{{ end }}'
        tags: "monitoring,{{ .CommonLabels.team }}"

  # DBA-specific OpsGenie
  - name: "dba-opsgenie"
    opsgenie_configs:
      - api_key: "${OPSGENIE_DBA_API_KEY}"
        message: "{{ .CommonAnnotations.summary }}"
        priority: '{{ if eq .CommonLabels.severity "critical" }}P1{{ else }}P2{{ end }}'
        tags: "database,{{ .CommonLabels.alertname }}"
        teams:
          - name: "database-team"

inhibit_rules:
  # Don't send warning if critical is already firing for same alert
  - source_match:
      severity: "critical"
    target_match:
      severity: "warning"
    equal: ["alertname", "instance"]
```

---

## 12. Real User Monitoring (RUM)

### OpenTelemetry Browser SDK

For the Next.js frontend, capture real user performance data.

**Install:**

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-trace-web \
  @opentelemetry/instrumentation-document-load \
  @opentelemetry/instrumentation-fetch \
  @opentelemetry/instrumentation-xml-http-request \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/context-zone
```

**lib/otel-browser.ts:**

```typescript
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export function initBrowserTelemetry() {
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: "myapp-frontend",
    [ATTR_SERVICE_VERSION]: "1.0.0",
  });

  const provider = new WebTracerProvider({ resource });

  const exporter = new OTLPTraceExporter({
    // Route through your API to avoid CORS issues
    url: "/api/telemetry/traces",
  });

  provider.addSpanProcessor(
    new BatchSpanProcessor(exporter, {
      maxQueueSize: 100,
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000,
    })
  );

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        // Propagate trace context to your API
        propagateTraceHeaderCorsUrls: [/\/api\//],
        clearTimingResources: true,
      }),
      new XMLHttpRequestInstrumentation({
        propagateTraceHeaderCorsUrls: [/\/api\//],
      }),
    ],
  });

  // Core Web Vitals as custom spans
  if (typeof window !== "undefined" && "PerformanceObserver" in window) {
    reportWebVitals(provider);
  }
}

function reportWebVitals(provider: WebTracerProvider) {
  const tracer = provider.getTracer("web-vitals");

  // LCP, FID, CLS via web-vitals library
  import("web-vitals").then(({ onLCP, onFID, onCLS, onINP, onTTFB }) => {
    const report = (metric: { name: string; value: number; id: string }) => {
      const span = tracer.startSpan(`web-vital.${metric.name}`);
      span.setAttribute("web_vital.name", metric.name);
      span.setAttribute("web_vital.value", metric.value);
      span.setAttribute("web_vital.id", metric.id);
      span.end();
    };

    onLCP(report);
    onFID(report);
    onCLS(report);
    onINP(report);
    onTTFB(report);
  });
}
```

**Initialize in your app layout (Next.js App Router):**

```typescript
// app/providers.tsx
"use client";

import { useEffect } from "react";

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    import("@/lib/otel-browser").then(({ initBrowserTelemetry }) => {
      initBrowserTelemetry();
    });
  }, []);

  return <>{children}</>;
}
```

---

## 13. Deployment Order

When setting up the monitoring stack from scratch, follow this order to avoid dependency failures:

```
Step 1: Infrastructure exporters (no dependencies)
  └── Node Exporter
  └── PostgreSQL Exporter
  └── Redis Exporter

Step 2: Collection & storage layer
  └── Prometheus (scrapes exporters from step 1)
  └── Jaeger (receives OTLP traces)
  └── Seq (receives Serilog logs)

Step 3: Alerting
  └── Alertmanager (Prometheus sends alerts here)

Step 4: Visualization
  └── Grafana (queries Prometheus, links to Jaeger)

Step 5: Application instrumentation
  └── Deploy .NET app with OTEL SDK + Serilog configured
  └── Verify /metrics endpoint responds
  └── Verify traces appear in Jaeger UI
  └── Verify logs appear in Seq

Step 6: Frontend RUM
  └── Deploy browser SDK
  └── Verify frontend traces in Jaeger
```

**docker-compose launch command:**

```bash
# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Verify all containers are healthy
docker compose -f docker-compose.monitoring.yml ps

# Check Prometheus targets are UP
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Check Grafana is accessible
curl -s http://localhost:3000/api/health

# Check Jaeger UI
curl -s http://localhost:16686/
```

---

## 14. Summary & Recommendations

### What We Covered

| Area | Tool/Technology | Key Benefit |
|------|-----------------|-------------|
| Distributed Tracing | OpenTelemetry + Jaeger | End-to-end request visibility across services |
| Metrics | OpenTelemetry + Prometheus + Grafana | Real-time dashboards, historical analysis, alerting |
| Structured Logging | Serilog + Seq/Elasticsearch | Searchable, correlated logs with trace context |
| Alerting | Prometheus Rules + Alertmanager | PagerDuty/OpsGenie integration, severity routing |
| Health Checks | ASP.NET Health Checks + UI | Readiness/liveness probes, dependency monitoring |
| RUM | OpenTelemetry Browser SDK | Real user performance (Core Web Vitals) |
| Infrastructure | Node/Postgres/Redis Exporters | Host, database, and cache visibility |
| Application | Slow query interceptor, Correlation IDs | Debugging, performance analysis |

### Actionable Recommendations

1. **Start with Prometheus + Grafana + Serilog** — these give the biggest bang for effort
2. **Add Jaeger early** — distributed tracing is invaluable once you have >1 service
3. **Set up alerts before you need them** — the alert rules above cover the most common failure modes
4. **Use correlation IDs from day one** — retrofitting them is painful
5. **Monitor the monitoring** — Prometheus should scrape itself; set alerts for Prometheus disk/memory
6. **Set retention policies** — 30 days for metrics (Prometheus), 14 days for traces (Jaeger), 30 days for logs
7. **In production, use Badger or Cassandra for Jaeger** — the all-in-one image is for dev/staging only
8. **Keep /health endpoints out of traces** — filter them in OTEL config to reduce noise

### NuGet Package Summary

| Package | Purpose |
|---------|---------|
| `OpenTelemetry.Extensions.Hosting` | OTEL host integration |
| `OpenTelemetry.Instrumentation.AspNetCore` | HTTP request traces/metrics |
| `OpenTelemetry.Instrumentation.Http` | HttpClient traces |
| `OpenTelemetry.Instrumentation.EntityFrameworkCore` | EF Core query traces |
| `OpenTelemetry.Instrumentation.Runtime` | GC, thread pool, JIT metrics |
| `OpenTelemetry.Instrumentation.Process` | CPU, memory metrics |
| `OpenTelemetry.Exporter.OpenTelemetryProtocol` | OTLP export (Jaeger/Collector) |
| `OpenTelemetry.Exporter.Prometheus.AspNetCore` | /metrics endpoint |
| `Serilog.AspNetCore` | Structured logging |
| `Serilog.Sinks.Seq` | Seq log sink |
| `Serilog.Sinks.Elasticsearch` | ELK stack sink |
| `Serilog.Enrichers.Span` | TraceId/SpanId in logs |
| `AspNetCore.HealthChecks.NpgSql` | PostgreSQL health check |
| `AspNetCore.HealthChecks.Redis` | Redis health check |
| `AspNetCore.HealthChecks.UI` | Health check dashboard |

---

*This report is part of the .NET/EF Core production readiness series. See also:*
- *[dotnet-efcore-scalability-report.md](dotnet-efcore-scalability-report.md) — Architecture & scaling patterns*
- *[efcore-database-scaling-report.md](efcore-database-scaling-report.md) — Database scaling & optimization*
- *[dotnet-load-testing-performance-report.md](dotnet-load-testing-performance-report.md) — Load testing & profiling*
