# Scalable Web Applications on Dedicated Servers with Entity Framework Core (.NET)

## Comprehensive Architecture & Best Practices Report
**Research Date:** February 2026
**Target Runtimes:** .NET 8 LTS / .NET 9 (current) / EF Core 8-9
**Deployment Target:** Dedicated (bare-metal / VPS) servers — not cloud PaaS

---

## Table of Contents

1. [Horizontal vs Vertical Scaling](#1-horizontal-vs-vertical-scaling)
2. [Microservices vs Monolith](#2-microservices-vs-monolith)
3. [Load Balancing Strategies](#3-load-balancing-strategies)
4. [Application Server Clustering](#4-application-server-clustering)
5. [Connection Pooling & EF Core Optimization](#5-connection-pooling--ef-core-optimization)
6. [CQRS and Event Sourcing](#6-cqrs-and-event-sourcing)
7. [Message Queues](#7-message-queues)
8. [API Gateway Patterns](#8-api-gateway-patterns)
9. [gRPC vs REST](#9-grpc-vs-rest)
10. [Health Checks & Circuit Breakers](#10-health-checks--circuit-breakers)
11. [Master Architecture Diagram](#11-master-architecture-diagram)
12. [NuGet Package Reference](#12-nuget-package-reference)
13. [Recommendations & Decision Matrix](#13-recommendations--decision-matrix)

---

## 1. Horizontal vs Vertical Scaling

### Definitions

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Vertical** | Add CPU/RAM/SSD to existing server | Quick wins, DB servers, single-point bottlenecks |
| **Horizontal** | Add more server instances behind a load balancer | Sustained growth, HA requirements, stateless APIs |

### Architecture: Horizontal Scaling on Dedicated Servers

```
                        Internet
                           |
                    +------+------+
                    |   DNS / IP  |
                    +------+------+
                           |
                    +------+------+
                    | Load Balancer|  (HAProxy / Nginx / YARP)
                    +------+------+
                     /     |      \
            +-------+ +-------+ +-------+
            | App 1 | | App 2 | | App 3 |   <-- ASP.NET Core + Kestrel
            +---+---+ +---+---+ +---+---+
                |         |         |
            +---+---+ +---+---+ +---+---+
            |  EF   | |  EF   | |  EF   |   <-- EF Core DbContext (pooled)
            +---+---+ +---+---+ +---+---+
                 \        |        /
              +---+-------+-------+---+
              |    Database Cluster    |  (SQL Server / PostgreSQL)
              |  Primary + Read Replicas|
              +------------------------+
                         |
              +----------+----------+
              |   Distributed Cache  |  (Redis Cluster)
              +---------------------+
```

### Requirements for Horizontal Scaling with ASP.NET Core

1. **Stateless Application Design** — No in-process session state
2. **Externalized State** — Session, cache, and temp data in Redis/SQL
3. **Shared Data Protection Keys** — Use `DataProtection` with Redis/SQL persistence
4. **Distributed Cache** — `IDistributedCache` via Redis
5. **Database Connection Management** — Connection pooling tuned per instance
6. **Health Check Endpoints** — For load balancer probing

### Data Protection Key Sharing (Required for Multi-Instance)

```csharp
// Program.cs — Share data protection keys across all instances
builder.Services.AddDataProtection()
    .PersistKeysToStackExchangeRedis(
        ConnectionMultiplexer.Connect("redis-server:6379"),
        "DataProtection-Keys")
    .SetApplicationName("MyApp");
```

### Vertical Scaling Limits on Dedicated Servers

| Resource | Typical Ceiling | Impact on .NET |
|----------|----------------|----------------|
| CPU cores | 64-128 (dual socket) | .NET ThreadPool scales automatically |
| RAM | 512 GB - 2 TB | GC pause times increase beyond 64 GB |
| SSD IOPS | ~1M NVMe | EF Core query I/O bound after this |
| Network | 10-25 Gbps | Rarely the bottleneck for API traffic |

**Recommendation:** Start with vertical scaling (it is simpler). Move to horizontal when:
- A single server reaches >70% sustained CPU utilization
- You need zero-downtime deployments (rolling updates)
- You require geographic distribution
- High availability (HA) is a business requirement

---

## 2. Microservices vs Monolith

### 2025-2026 Consensus: Start Modular Monolith

The industry consensus for .NET in 2025-2026 has shifted decisively toward the
**Modular Monolith** as the default starting architecture, with microservices
extraction as an evolution strategy.

```
EVOLUTION PATH:

  Monolith  --->  Modular Monolith  --->  Microservices (selective)
  (Phase 1)       (Phase 2)                (Phase 3 — only if needed)

  Single project   Bounded contexts       Independent deployments
  Shared DB         Separate DbContexts    Separate databases
  Direct calls      Module APIs            HTTP/gRPC/Messages
```

### Modular Monolith Architecture with EF Core

```
Solution: Enterprise.sln
|
+-- src/
|   +-- Enterprise.Api/              <-- Single host project
|   |   +-- Program.cs
|   |   +-- appsettings.json
|   |
|   +-- Modules/
|   |   +-- Enterprise.Orders/       <-- Module: Orders bounded context
|   |   |   +-- Domain/
|   |   |   +-- Application/
|   |   |   +-- Infrastructure/
|   |   |   +-- OrdersDbContext.cs    <-- Own EF Core DbContext
|   |   |   +-- OrdersModule.cs      <-- Module registration
|   |   |
|   |   +-- Enterprise.Inventory/    <-- Module: Inventory bounded context
|   |   |   +-- Domain/
|   |   |   +-- Application/
|   |   |   +-- Infrastructure/
|   |   |   +-- InventoryDbContext.cs <-- Own EF Core DbContext
|   |   |   +-- InventoryModule.cs
|   |   |
|   |   +-- Enterprise.Identity/     <-- Module: Identity/Auth
|   |       +-- ...
|   |
|   +-- Enterprise.SharedKernel/      <-- Shared abstractions ONLY
|       +-- IModule.cs
|       +-- IntegrationEvent.cs
|
+-- tests/
    +-- Enterprise.Orders.Tests/
    +-- Enterprise.Inventory.Tests/
```

### Module Registration Pattern

```csharp
// IModule.cs (SharedKernel)
public interface IModule
{
    void RegisterServices(IServiceCollection services, IConfiguration config);
    void MapEndpoints(IEndpointRouteBuilder endpoints);
}

// OrdersModule.cs
public class OrdersModule : IModule
{
    public void RegisterServices(IServiceCollection services, IConfiguration config)
    {
        services.AddDbContextPool<OrdersDbContext>(options =>
            options.UseSqlServer(config.GetConnectionString("OrdersDb")));

        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(OrdersModule).Assembly));
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGroup("/api/orders")
            .MapOrderEndpoints()
            .WithTags("Orders");
    }
}

// Program.cs — Host registers all modules
var modules = new IModule[]
{
    new OrdersModule(),
    new InventoryModule(),
    new IdentityModule()
};

foreach (var module in modules)
    module.RegisterServices(builder.Services, builder.Configuration);

var app = builder.Build();

foreach (var module in modules)
    module.MapEndpoints(app);
```

### When to Extract a Microservice

| Signal | Action |
|--------|--------|
| Module needs independent scaling (e.g., 10x more traffic) | Extract with own DB |
| Module has different deployment cadence | Extract with CI/CD pipeline |
| Module needs different technology (Python ML, etc.) | Extract as service |
| Team size exceeds 8-10 per module | Consider extraction |
| Module failure should not affect others | Extract with circuit breakers |

### Anti-Patterns to Avoid

- **Distributed Monolith**: Microservices that share a database or require synchronous orchestration
- **Premature Decomposition**: Splitting before understanding domain boundaries
- **Shared EF Core DbContext across services**: Each service/module MUST own its data

---

## 3. Load Balancing Strategies

### Comparison for Dedicated Servers

| Feature | HAProxy | Nginx | YARP (.NET) |
|---------|---------|-------|-------------|
| **Layer** | L4 (TCP) + L7 (HTTP) | L7 (HTTP) primarily | L7 (HTTP) |
| **Performance** | Highest raw throughput | Excellent for HTTP | Excellent for .NET |
| **Config** | Text-based | Text-based | JSON / C# code |
| **Health Checks** | Built-in (active + passive) | Active (paid in Plus) | Built-in |
| **SSL Termination** | Yes | Yes (preferred) | Yes |
| **gRPC Support** | Yes (L4 passthrough) | Yes (since 1.13) | Native |
| **WebSocket** | Yes | Yes | Yes |
| **Best For** | Pure load balancing at scale | HTTP features + static files | .NET-native API gateway |
| **Community** | Large | Massive | Growing (Microsoft-backed) |

### HAProxy Configuration for ASP.NET Core

```haproxy
# /etc/haproxy/haproxy.cfg

global
    maxconn 50000
    log /dev/log local0
    stats socket /run/haproxy/admin.sock mode 660

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    option httplog
    option dontlognull
    option http-server-close
    option forwardfor

frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/app.pem alpn h2,http/1.1
    redirect scheme https code 301 if !{ ssl_fc }

    # Route API traffic
    acl is_api path_beg /api/
    use_backend api_servers if is_api
    default_backend web_servers

backend api_servers
    balance leastconn
    option httpchk GET /health
    http-check expect status 200

    # Sticky sessions (if absolutely needed)
    # cookie SERVERID insert indirect nocache

    server api1 10.0.1.10:5000 check inter 5s fall 3 rise 2 maxconn 1000
    server api2 10.0.1.11:5000 check inter 5s fall 3 rise 2 maxconn 1000
    server api3 10.0.1.12:5000 check inter 5s fall 3 rise 2 maxconn 1000

backend web_servers
    balance roundrobin
    option httpchk GET /health
    server web1 10.0.2.10:5000 check
    server web2 10.0.2.11:5000 check

listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    stats admin if LOCALHOST
```

### Nginx Configuration for ASP.NET Core

```nginx
# /etc/nginx/nginx.conf

upstream aspnet_api {
    least_conn;
    server 10.0.1.10:5000 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:5000 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:5000 max_fails=3 fail_timeout=30s;
    keepalive 64;  # Connection pooling to upstream
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /etc/ssl/certs/api.crt;
    ssl_certificate_key /etc/ssl/private/api.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Proxy headers for ASP.NET Core
    location / {
        proxy_pass         http://aspnet_api;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
    }

    # Health check endpoint (no caching)
    location /health {
        proxy_pass http://aspnet_api;
        proxy_no_cache 1;
    }

    # Static files (serve directly from Nginx)
    location /static/ {
        root /var/www/app;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### ASP.NET Core: Forwarded Headers Middleware (Required)

```csharp
// Program.cs — MUST configure for any reverse proxy
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Trust the proxy network
    options.KnownProxies.Add(IPAddress.Parse("10.0.0.1"));
    // Or trust a network range
    options.KnownNetworks.Add(new IPNetwork(IPAddress.Parse("10.0.0.0"), 8));
});

// Must be FIRST middleware
app.UseForwardedHeaders();
```

### Combined Architecture (HAProxy + Nginx)

```
                      Internet
                          |
                   +------+------+
                   |   HAProxy   |  <-- L4 TCP load balancing
                   |  (Primary)  |     SSL termination
                   +------+------+     Connection steering
                    /     |      \     Health checks
           +-------+ +-------+ +-------+
           | Nginx | | Nginx | | Nginx |  <-- L7 HTTP handling
           |  (1)  | |  (2)  | |  (3)  |     Static file serving
           +---+---+ +---+---+ +---+---+     Response compression
               |         |         |          Caching
           +---+---+ +---+---+ +---+---+
           | App 1 | | App 2 | | App 3 |  <-- ASP.NET Core + Kestrel
           +-------+ +-------+ +-------+      Port 5000 (localhost)
```

---

## 4. Application Server Clustering

### Running Multiple ASP.NET Core Instances on Dedicated Servers

#### Option A: Multiple Processes on Same Server (Vertical Utilization)

```bash
# systemd service template: /etc/systemd/system/myapp@.service
[Unit]
Description=MyApp Instance %i
After=network.target

[Service]
Type=exec
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/MyApp --urls http://localhost:500%i
Restart=always
RestartSec=5
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_GCServer=1
Environment=DOTNET_GCConcurrent=1
LimitNOFILE=65535
User=myapp

[Install]
WantedBy=multi-user.target
```

```bash
# Enable 4 instances on one server
systemctl enable myapp@0 myapp@1 myapp@2 myapp@3
systemctl start myapp@0 myapp@1 myapp@2 myapp@3
# Instances listen on: 5000, 5001, 5002, 5003
```

#### Option B: Docker Containers on Dedicated Servers

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY publish/ .
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENV DOTNET_GCServer=1
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

```yaml
# docker-compose.yml — Multiple instances on same host
services:
  app1:
    build: .
    ports: ["5001:5000"]
    environment:
      - ConnectionStrings__Default=Server=db;Database=MyApp;...
      - Redis__Connection=redis:6379
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G

  app2:
    build: .
    ports: ["5002:5000"]
    environment:
      - ConnectionStrings__Default=Server=db;Database=MyApp;...
      - Redis__Connection=redis:6379
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G

  nginx:
    image: nginx:alpine
    ports: ["443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on: [app1, app2]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### Kestrel Tuning for High Concurrency

```csharp
// Program.cs
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxConcurrentConnections = 10_000;
    options.Limits.MaxConcurrentUpgradedConnections = 5_000;
    options.Limits.MaxRequestBodySize = 52_428_800; // 50 MB
    options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(2);
    options.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(30);

    // HTTP/2 settings
    options.Limits.Http2.MaxStreamsPerConnection = 100;
    options.Limits.Http2.InitialConnectionWindowSize = 1_048_576; // 1 MB
    options.Limits.Http2.InitialStreamWindowSize = 768 * 1024;

    // Listen configuration
    options.ListenAnyIP(5000, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
    });
});
```

### .NET Runtime Tuning (Environment Variables)

```bash
# GC tuning for server workloads
DOTNET_GCServer=1                           # Server GC mode (multi-core)
DOTNET_GCConcurrent=1                       # Background GC (reduces pauses)
DOTNET_GCHeapCount=8                        # Match physical core count
DOTNET_GCHighMemPercent=0x5A                # 90% mem threshold before aggressive GC
DOTNET_TieredCompilation=1                  # Default in .NET 8+
DOTNET_ReadyToRun=1                         # Use pre-compiled code

# Thread pool tuning
DOTNET_ThreadPool_UnfairSemaphoreSpinLimit=0  # Reduce spinning in high-concurrency
```

---

## 5. Connection Pooling & EF Core Optimization

### The Three Layers of Pooling

```
Layer 1: DbContext Pooling (EF Core)
    |
    v
Layer 2: ADO.NET Connection Pooling (SqlClient / Npgsql)
    |
    v
Layer 3: External Connection Pooler (PgBouncer / ProxySQL) [optional]
```

### Layer 1: DbContext Pooling

```csharp
// PREFERRED: Use AddDbContextPool (reuses DbContext instances)
builder.Services.AddDbContextPool<AppDbContext>(options =>
{
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null);
        sqlOptions.CommandTimeout(30);
        sqlOptions.MigrationsAssembly("MyApp.Infrastructure");
    });

    // Performance optimizations
    options.EnableSensitiveDataLogging(false);    // OFF in production
    options.EnableDetailedErrors(false);           // OFF in production
    options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking); // Default read-only
}, poolSize: 1024);  // DbContext pool size (default 1024 in .NET 8+)

// Alternative: PooledDbContextFactory for manual control
builder.Services.AddPooledDbContextFactory<AppDbContext>(options => { /* same */ });
```

### Layer 2: ADO.NET Connection String Tuning

```json
{
  "ConnectionStrings": {
    "SqlServer": "Server=10.0.3.10;Database=MyApp;User Id=app;Password=***;TrustServerCertificate=True;Max Pool Size=200;Min Pool Size=20;Connection Timeout=15;Command Timeout=30;MultipleActiveResultSets=False;Encrypt=True;Pooling=True;",
    "PostgreSQL": "Host=10.0.3.10;Port=5432;Database=myapp;Username=app;Password=***;Maximum Pool Size=200;Minimum Pool Size=20;Connection Idle Lifetime=300;Connection Pruning Interval=10;Timeout=15;Command Timeout=30;Include Error Detail=false;SSL Mode=Require;"
  }
}
```

### Layer 3: External Connection Pooler (PostgreSQL)

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
myapp = host=10.0.3.10 port=5432 dbname=myapp

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
pool_mode = transaction          # Best for EF Core
default_pool_size = 50           # Per database
max_client_conn = 2000           # Total client connections
reserve_pool_size = 10
server_idle_timeout = 300
```

### EF Core Query Optimization Patterns

```csharp
// 1. Compiled Queries — 30-70% faster for repeated queries
private static readonly Func<AppDbContext, int, Task<Order?>> GetOrderById =
    EF.CompileAsyncQuery((AppDbContext ctx, int id) =>
        ctx.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .FirstOrDefault(o => o.Id == id));

// Usage
var order = await GetOrderById(dbContext, orderId);

// 2. Split Queries — Prevent cartesian explosion with multiple includes
var orders = await dbContext.Orders
    .Include(o => o.Items)
    .Include(o => o.Payments)
    .AsSplitQuery()           // Separate SQL per include
    .AsNoTracking()
    .ToListAsync();

// 3. Projection — Only select needed columns
var orderSummaries = await dbContext.Orders
    .Where(o => o.Status == OrderStatus.Active)
    .Select(o => new OrderSummaryDto
    {
        Id = o.Id,
        Total = o.Items.Sum(i => i.Price * i.Quantity),
        ItemCount = o.Items.Count
    })
    .ToListAsync();

// 4. Batch Operations (EF Core 7+) — Bulk update without loading entities
await dbContext.Orders
    .Where(o => o.CreatedAt < DateTime.UtcNow.AddYears(-2))
    .ExecuteUpdateAsync(s => s
        .SetProperty(o => o.Status, OrderStatus.Archived)
        .SetProperty(o => o.ArchivedAt, DateTime.UtcNow));

// 5. Bulk Delete
await dbContext.TempRecords
    .Where(t => t.ExpiresAt < DateTime.UtcNow)
    .ExecuteDeleteAsync();

// 6. Raw SQL for complex queries
var results = await dbContext.Database
    .SqlQuery<RevenueReport>($"""
        SELECT
            DATE_TRUNC('month', o.created_at) AS Month,
            SUM(oi.price * oi.quantity) AS Revenue,
            COUNT(DISTINCT o.id) AS OrderCount
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.created_at >= {startDate}
        GROUP BY DATE_TRUNC('month', o.created_at)
        ORDER BY Month
        """)
    .ToListAsync();
```

### Performance Benchmark Comparison

| Technique | Avg Query Time | Improvement |
|-----------|---------------|-------------|
| Standard LINQ query | 4.2 ms | Baseline |
| + AsNoTracking() | 3.1 ms | ~26% faster |
| + Compiled Query | 1.8 ms | ~57% faster |
| + Projection (Select) | 1.2 ms | ~71% faster |
| + DbContext Pooling | Further ~15-20% reduction in overhead |

### EF Core 9 Specific Improvements

- **Pre-compiled queries** (AOT-friendly) — reduces startup latency
- **Compiled models** — optimized metadata loading, reduces memory
- **GroupBy on complex types** — new LINQ translation
- **Azure Cosmos DB provider rewrite** — significant improvements
- **HierarchyId support** for SQL Server tree structures
- **Sentinel values** for better default value handling

---

## 6. CQRS and Event Sourcing

### CQRS Architecture with EF Core

```
                    +------------------+
                    |   API Gateway    |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
      +-------+-------+           +--------+--------+
      |  Command Side |           |   Query Side     |
      | (Write Model) |           |  (Read Model)    |
      +-------+-------+           +--------+---------+
              |                             |
      +-------+-------+           +--------+---------+
      | Command Handler|          | Query Handler     |
      |  (MediatR)     |          |  (MediatR)        |
      +-------+-------+           +--------+---------+
              |                             |
      +-------+-------+           +--------+---------+
      | EF Core Write  |          | EF Core Read      |
      |  DbContext      |          | DbContext          |
      | (Full tracking) |          | (NoTracking)       |
      +-------+-------+           +--------+---------+
              |                             |
      +-------+-------+           +--------+---------+
      | Write Database |           | Read Database     |
      | (Primary)      |           | (Replica / View)  |
      +----------------+           +-------------------+
              |
      +-------+-------+
      | Domain Events  | ---> Event Bus ---> Projections
      +----------------+
```

### Implementation with MediatR

```csharp
// NuGet: MediatR (v12+)

// --- Command ---
public record CreateOrderCommand(
    int CustomerId,
    List<OrderItemDto> Items) : IRequest<OrderResult>;

public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, OrderResult>
{
    private readonly WriteDbContext _writeDb;
    private readonly IPublisher _publisher;

    public CreateOrderHandler(WriteDbContext writeDb, IPublisher publisher)
    {
        _writeDb = writeDb;
        _publisher = publisher;
    }

    public async Task<OrderResult> Handle(
        CreateOrderCommand request, CancellationToken ct)
    {
        var order = Order.Create(request.CustomerId, request.Items);

        _writeDb.Orders.Add(order);
        await _writeDb.SaveChangesAsync(ct);

        // Publish domain events
        foreach (var domainEvent in order.DomainEvents)
            await _publisher.Publish(domainEvent, ct);

        return new OrderResult(order.Id);
    }
}

// --- Query ---
public record GetOrderQuery(int OrderId) : IRequest<OrderDto?>;

public class GetOrderHandler : IRequestHandler<GetOrderQuery, OrderDto?>
{
    private readonly ReadDbContext _readDb;

    public GetOrderHandler(ReadDbContext readDb) => _readDb = readDb;

    public async Task<OrderDto?> Handle(
        GetOrderQuery request, CancellationToken ct)
    {
        return await _readDb.OrderViews
            .AsNoTracking()
            .Where(o => o.Id == request.OrderId)
            .Select(o => new OrderDto
            {
                Id = o.Id,
                CustomerName = o.CustomerName,
                Total = o.Total,
                Status = o.Status
            })
            .FirstOrDefaultAsync(ct);
    }
}

// --- Domain Event ---
public record OrderCreatedEvent(int OrderId, int CustomerId, decimal Total)
    : INotification;

// --- Projection Handler (updates read model) ---
public class OrderProjectionHandler : INotificationHandler<OrderCreatedEvent>
{
    private readonly ReadDbContext _readDb;

    public OrderProjectionHandler(ReadDbContext readDb) => _readDb = readDb;

    public async Task Handle(OrderCreatedEvent notification, CancellationToken ct)
    {
        var view = new OrderView
        {
            Id = notification.OrderId,
            CustomerId = notification.CustomerId,
            Total = notification.Total,
            Status = "Created"
        };
        _readDb.OrderViews.Add(view);
        await _readDb.SaveChangesAsync(ct);
    }
}
```

### Separate Read/Write DbContexts

```csharp
// Write context — full change tracking, validations
public class WriteDbContext : DbContext
{
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Customer> Customers => Set<Customer>();

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        options.UseQueryTrackingBehavior(QueryTrackingBehavior.TrackAll);
    }
}

// Read context — optimized for queries, no tracking
public class ReadDbContext : DbContext
{
    public DbSet<OrderView> OrderViews => Set<OrderView>();
    public DbSet<CustomerView> CustomerViews => Set<CustomerView>();

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
    }
}

// Registration — different connection strings (primary vs replica)
builder.Services.AddDbContextPool<WriteDbContext>(options =>
    options.UseSqlServer(config.GetConnectionString("WritePrimary")));

builder.Services.AddDbContextPool<ReadDbContext>(options =>
    options.UseSqlServer(config.GetConnectionString("ReadReplica")));
```

### Event Sourcing with Event Store

```csharp
// Event Store table (EF Core)
public class StoredEvent
{
    public long Id { get; set; }
    public Guid StreamId { get; set; }
    public string EventType { get; set; } = default!;
    public string Data { get; set; } = default!;     // JSON
    public string Metadata { get; set; } = default!;  // JSON
    public int Version { get; set; }
    public DateTime Timestamp { get; set; }
}

// Event Store implementation
public class EfCoreEventStore : IEventStore
{
    private readonly EventStoreDbContext _db;

    public async Task AppendAsync(
        Guid streamId, IReadOnlyList<IDomainEvent> events, int expectedVersion)
    {
        var currentVersion = await _db.Events
            .Where(e => e.StreamId == streamId)
            .MaxAsync(e => (int?)e.Version) ?? -1;

        if (currentVersion != expectedVersion)
            throw new ConcurrencyException(streamId, expectedVersion, currentVersion);

        var storedEvents = events.Select((e, i) => new StoredEvent
        {
            StreamId = streamId,
            EventType = e.GetType().AssemblyQualifiedName!,
            Data = JsonSerializer.Serialize(e, e.GetType()),
            Version = expectedVersion + i + 1,
            Timestamp = DateTime.UtcNow
        });

        _db.Events.AddRange(storedEvents);
        await _db.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<IDomainEvent>> GetStreamAsync(Guid streamId)
    {
        var storedEvents = await _db.Events
            .Where(e => e.StreamId == streamId)
            .OrderBy(e => e.Version)
            .ToListAsync();

        return storedEvents.Select(e =>
        {
            var type = Type.GetType(e.EventType)!;
            return (IDomainEvent)JsonSerializer.Deserialize(e.Data, type)!;
        }).ToList();
    }
}
```

### Recommended Event Sourcing Libraries for .NET

| Library | Stars | Best For |
|---------|-------|----------|
| **Marten** (v7+) | 2.7k+ | PostgreSQL event store + document DB |
| **EventStoreDB** | Dedicated | Purpose-built event store (gRPC protocol) |
| **Wolverine** | 1k+ | Messaging + Event Sourcing + CQRS framework |
| **Custom EF Core** | — | Simple event sourcing, full control |

---

## 7. Message Queues

### Comparison: RabbitMQ vs Apache Kafka

| Feature | RabbitMQ | Apache Kafka |
|---------|----------|--------------|
| **Model** | Message broker (push) | Event streaming (pull) |
| **Delivery** | At-least-once, at-most-once | At-least-once, exactly-once |
| **Message Retention** | Until consumed | Configurable (days/forever) |
| **Throughput** | ~50K msg/sec | ~1M+ msg/sec |
| **Ordering** | Per queue | Per partition |
| **Replay** | No (messages deleted) | Yes (offset-based) |
| **Best For** | Task queues, RPC, routing | Event streaming, log aggregation |
| **Operational Complexity** | Low-medium | High (ZooKeeper/KRaft) |
| **.NET Library** | MassTransit / RabbitMQ.Client | MassTransit / Confluent.Kafka |

### Architecture: Message-Based Communication

```
  +----------+     +------------+     +-----------+
  | Orders   |---->| RabbitMQ / |---->| Inventory |
  | Service  |     | Kafka      |     | Service   |
  +----------+     | Cluster    |     +-----------+
                   |            |
  +----------+     |            |     +-----------+
  | Payment  |---->|            |---->| Shipping  |
  | Service  |     |            |     | Service   |
  +----------+     +------------+     +-----------+
                        |
                   +-----------+
                   | Analytics |  (Kafka consumer group)
                   | Service   |
                   +-----------+
```

### MassTransit with RabbitMQ (Recommended Abstraction)

```csharp
// NuGet packages:
// MassTransit (v8.2+)
// MassTransit.RabbitMQ

// --- Integration Event ---
public record OrderPlacedEvent
{
    public int OrderId { get; init; }
    public int CustomerId { get; init; }
    public decimal Total { get; init; }
    public DateTime PlacedAt { get; init; }
}

// --- Publisher (Orders Service) ---
public class OrderService
{
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly OrdersDbContext _db;

    public OrderService(IPublishEndpoint publishEndpoint, OrdersDbContext db)
    {
        _publishEndpoint = publishEndpoint;
        _db = db;
    }

    public async Task PlaceOrderAsync(CreateOrderRequest request)
    {
        var order = new Order { /* ... */ };
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        await _publishEndpoint.Publish(new OrderPlacedEvent
        {
            OrderId = order.Id,
            CustomerId = order.CustomerId,
            Total = order.Total,
            PlacedAt = DateTime.UtcNow
        });
    }
}

// --- Consumer (Inventory Service) ---
public class OrderPlacedConsumer : IConsumer<OrderPlacedEvent>
{
    private readonly InventoryDbContext _db;
    private readonly ILogger<OrderPlacedConsumer> _logger;

    public OrderPlacedConsumer(InventoryDbContext db, ILogger<OrderPlacedConsumer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderPlacedEvent> context)
    {
        _logger.LogInformation("Processing order {OrderId}", context.Message.OrderId);
        // Reserve inventory, update stock levels, etc.
        await _db.SaveChangesAsync();
    }
}

// --- Registration (Program.cs) ---
builder.Services.AddMassTransit(x =>
{
    x.SetKebabCaseEndpointNameFormatter();

    // Auto-register all consumers in assembly
    x.AddConsumers(typeof(Program).Assembly);

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("rabbitmq://10.0.4.10", h =>
        {
            h.Username("app");
            h.Password("***");
        });

        // Retry policy
        cfg.UseMessageRetry(r => r.Exponential(
            retryLimit: 5,
            minInterval: TimeSpan.FromSeconds(1),
            maxInterval: TimeSpan.FromMinutes(1),
            intervalDelta: TimeSpan.FromSeconds(2)));

        // Circuit breaker
        cfg.UseCircuitBreaker(cb =>
        {
            cb.TrackingPeriod = TimeSpan.FromMinutes(1);
            cb.TripThreshold = 15;
            cb.ActiveThreshold = 10;
            cb.ResetInterval = TimeSpan.FromMinutes(5);
        });

        cfg.ConfigureEndpoints(context);
    });
});
```

### MassTransit with Kafka (Event Streaming)

```csharp
// NuGet: MassTransit.Kafka

builder.Services.AddMassTransit(x =>
{
    x.UsingInMemory(); // In-memory bus for non-Kafka messages

    x.AddRider(rider =>
    {
        rider.AddConsumer<OrderEventConsumer>();

        rider.AddProducer<OrderPlacedEvent>("order-events");

        rider.UsingKafka((context, k) =>
        {
            k.Host("10.0.4.20:9092,10.0.4.21:9092,10.0.4.22:9092");

            k.TopicEndpoint<OrderPlacedEvent>("order-events", "inventory-group", e =>
            {
                e.ConfigureConsumer<OrderEventConsumer>(context);
                e.AutoOffsetReset = AutoOffsetReset.Earliest;
                e.ConcurrencyLimit = 10;
            });
        });
    });
});
```

### Outbox Pattern (Transactional Messaging)

```csharp
// Ensures message publishing is atomic with DB transaction
// NuGet: MassTransit.EntityFrameworkCore

builder.Services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<AppDbContext>(o =>
    {
        o.UseSqlServer();          // or o.UsePostgres();
        o.UseBusOutbox();          // Enable outbox for all published messages
        o.QueryDelay = TimeSpan.FromSeconds(1);
        o.DuplicateDetectionWindow = TimeSpan.FromMinutes(5);
    });

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("rabbitmq://10.0.4.10");
        cfg.ConfigureEndpoints(context);
    });
});
```

---

## 8. API Gateway Patterns

### YARP vs Ocelot (2025-2026 Comparison)

| Feature | YARP 2.x | Ocelot 23.x |
|---------|----------|--------------|
| **Maintainer** | Microsoft (.NET team) | Community |
| **Performance** | Excellent (built on Kestrel) | Good (middleware-based) |
| **HTTP/2 + gRPC** | Native | Limited |
| **Config** | JSON + C# code + DB | JSON file |
| **Load Balancing** | Built-in (multiple policies) | Built-in |
| **Health Checks** | Built-in (active + passive) | Basic |
| **Rate Limiting** | Via middleware | Built-in |
| **Request Aggregation** | Custom middleware | Built-in |
| **Service Discovery** | Custom providers | Consul, Eureka |
| **Transforms** | Powerful (headers, path, query) | Basic |
| **Auth** | ASP.NET Core native | ASP.NET Core native |
| **.NET 9 Support** | First-class | Community-maintained |
| **Recommendation** | **PRIMARY CHOICE** | Legacy / Simple projects |

### YARP API Gateway Configuration

```json
// appsettings.json
{
  "ReverseProxy": {
    "Routes": {
      "orders-route": {
        "ClusterId": "orders-cluster",
        "Match": {
          "Path": "/api/orders/{**catch-all}"
        },
        "Transforms": [
          { "PathRemovePrefix": "/api/orders" },
          { "RequestHeader": "X-Gateway": "true" }
        ],
        "Metadata": {
          "RequireAuth": "true"
        }
      },
      "inventory-route": {
        "ClusterId": "inventory-cluster",
        "Match": {
          "Path": "/api/inventory/{**catch-all}"
        },
        "Transforms": [
          { "PathRemovePrefix": "/api/inventory" }
        ]
      },
      "identity-route": {
        "ClusterId": "identity-cluster",
        "Match": {
          "Path": "/api/auth/{**catch-all}"
        }
      }
    },
    "Clusters": {
      "orders-cluster": {
        "LoadBalancingPolicy": "RoundRobin",
        "HealthCheck": {
          "Active": {
            "Enabled": true,
            "Interval": "00:00:10",
            "Timeout": "00:00:05",
            "Path": "/health"
          },
          "Passive": {
            "Enabled": true,
            "Policy": "TransportFailureRate",
            "ReactivationPeriod": "00:00:30"
          }
        },
        "Destinations": {
          "orders-1": { "Address": "http://10.0.1.10:5000" },
          "orders-2": { "Address": "http://10.0.1.11:5000" },
          "orders-3": { "Address": "http://10.0.1.12:5000" }
        }
      },
      "inventory-cluster": {
        "LoadBalancingPolicy": "LeastRequests",
        "Destinations": {
          "inv-1": { "Address": "http://10.0.2.10:5001" },
          "inv-2": { "Address": "http://10.0.2.11:5001" }
        }
      },
      "identity-cluster": {
        "Destinations": {
          "id-1": { "Address": "http://10.0.3.10:5002" }
        }
      }
    }
  }
}
```

### YARP Gateway Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);

// Add YARP
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Add authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://identity.example.com";
        options.Audience = "api";
    });

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("api", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 100;
        opt.QueueLimit = 10;
    });
});

// Health checks
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy())
    .AddUrlGroup(new Uri("http://10.0.1.10:5000/health"), "orders")
    .AddUrlGroup(new Uri("http://10.0.2.10:5001/health"), "inventory");

var app = builder.Build();

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapReverseProxy();
app.MapHealthChecks("/health");

app.Run();
```

### Full Gateway Architecture

```
                         Internet
                            |
                     +------+------+
                     |  HAProxy    |  <-- SSL termination, TCP LB
                     +------+------+
                            |
                +----------+-----------+
                |                      |
         +------+------+       +------+------+
         | YARP Gateway|       | YARP Gateway|  <-- API routing, auth, rate limiting
         |  (Primary)  |       |  (Standby)  |
         +------+------+       +------+------+
                |
     +----------+----------+-----------+
     |          |          |           |
 +---+---+ +---+---+ +----+---+ +----+----+
 |Orders | |Invent.| |Identity| |Analytics|  <-- Backend services
 |Cluster| |Cluster| |Cluster | |Cluster  |
 +-------+ +-------+ +--------+ +---------+
```

---

## 9. gRPC vs REST

### Performance Comparison (2025 Benchmarks)

| Metric | gRPC | REST (JSON) | Improvement |
|--------|------|-------------|-------------|
| **Latency (1 KB)** | 0.38 ms | 2.1 ms | ~5.5x faster |
| **Latency (100 KB)** | 2.1 ms | 18 ms | ~8.5x faster |
| **Latency (1 MB)** | 14 ms | 140 ms | ~10x faster |
| **Throughput (32 KB)** | ~72,000 req/s | ~8,500 req/s | ~8.5x higher |
| **CPU Usage** | Baseline | +19% | gRPC 19% lower |
| **Memory** | Baseline | +34% | gRPC 34% lower |
| **Bandwidth** | Baseline | +41% | gRPC 41% lower |

### When to Use Each

| Use Case | Protocol | Reason |
|----------|----------|--------|
| **Internal service-to-service** | gRPC | Performance, type safety, streaming |
| **Public API** | REST | Browser compatibility, tooling, documentation |
| **Real-time streaming** | gRPC | Bidirectional streaming native |
| **Mobile clients** | REST or gRPC-Web | gRPC-Web via Envoy proxy |
| **Third-party integrations** | REST | Universal compatibility |
| **High-throughput data pipeline** | gRPC | Protobuf efficiency |

### Hybrid Architecture (Recommended)

```
                    External Clients
                    (Browsers, Mobile, 3rd party)
                           |
                     REST / JSON
                           |
                    +------+------+
                    | API Gateway |
                    | (YARP)      |
                    +------+------+
                           |
            +--------------+--------------+
            |              |              |
     +------+------+ +----+----+ +------+------+
     |   Orders    | |Inventory| |   Payment   |
     |   Service   | | Service | |   Service   |
     +------+------+ +----+----+ +------+------+
            |              |              |
            +----- gRPC ---+----- gRPC ---+
                  (Internal communication)
```

### gRPC Service Definition (.proto)

```protobuf
// Protos/inventory.proto
syntax = "proto3";

option csharp_namespace = "Enterprise.Inventory.Grpc";

package inventory;

service InventoryService {
    // Unary
    rpc CheckStock (StockRequest) returns (StockResponse);

    // Server streaming
    rpc WatchStockChanges (StockWatchRequest) returns (stream StockUpdate);

    // Client streaming
    rpc BatchUpdateStock (stream StockUpdateRequest) returns (BatchResult);
}

message StockRequest {
    int32 product_id = 1;
    int32 warehouse_id = 2;
}

message StockResponse {
    int32 product_id = 1;
    int32 available_quantity = 2;
    int32 reserved_quantity = 3;
    bool is_available = 4;
}

message StockUpdate {
    int32 product_id = 1;
    int32 new_quantity = 2;
    string change_reason = 3;
    google.protobuf.Timestamp updated_at = 4;
}
```

### gRPC Server Implementation

```csharp
// NuGet: Grpc.AspNetCore

public class InventoryGrpcService : InventoryService.InventoryServiceBase
{
    private readonly InventoryDbContext _db;

    public InventoryGrpcService(InventoryDbContext db) => _db = db;

    public override async Task<StockResponse> CheckStock(
        StockRequest request, ServerCallContext context)
    {
        var stock = await _db.StockLevels
            .AsNoTracking()
            .FirstOrDefaultAsync(s =>
                s.ProductId == request.ProductId &&
                s.WarehouseId == request.WarehouseId,
                context.CancellationToken);

        return new StockResponse
        {
            ProductId = request.ProductId,
            AvailableQuantity = stock?.Available ?? 0,
            ReservedQuantity = stock?.Reserved ?? 0,
            IsAvailable = (stock?.Available ?? 0) > 0
        };
    }
}

// Program.cs
builder.Services.AddGrpc(options =>
{
    options.MaxReceiveMessageSize = 16 * 1024 * 1024; // 16 MB
    options.MaxSendMessageSize = 16 * 1024 * 1024;
    options.EnableDetailedErrors = false; // Production
});

app.MapGrpcService<InventoryGrpcService>();
```

### gRPC Client (from Orders Service)

```csharp
// NuGet: Grpc.Net.ClientFactory

builder.Services.AddGrpcClient<InventoryService.InventoryServiceClient>(options =>
{
    options.Address = new Uri("http://10.0.2.10:5001");
})
.ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
{
    PooledConnectionIdleTimeout = Timeout.InfiniteTimeSpan,
    KeepAlivePingDelay = TimeSpan.FromSeconds(60),
    KeepAlivePingTimeout = TimeSpan.FromSeconds(30),
    EnableMultipleHttp2Connections = true
})
.AddPolicyHandler(GetRetryPolicy());  // Polly integration
```

---

## 10. Health Checks & Circuit Breakers

### Health Check Architecture

```
                    Load Balancer
                         |
                    /health/ready  (readiness — can accept traffic?)
                    /health/live   (liveness — is process alive?)
                         |
                  +------+------+
                  | ASP.NET Core |
                  +------+------+
                         |
         +---------------+---------------+
         |               |               |
    +----+-----+   +-----+-----+   +-----+-----+
    | Database |   |   Redis   |   |  RabbitMQ  |
    | Health   |   |   Health  |   |   Health   |
    +----------+   +-----------+   +-----------+
```

### Health Check Implementation

```csharp
// NuGet packages:
// Microsoft.Extensions.Diagnostics.HealthChecks
// AspNetCore.HealthChecks.SqlServer       (v8.0.2)
// AspNetCore.HealthChecks.NpgSql          (v8.0.2)
// AspNetCore.HealthChecks.Redis           (v8.0.1)
// AspNetCore.HealthChecks.RabbitMQ        (v8.0.2)
// AspNetCore.HealthChecks.UI             (v8.0.2)
// AspNetCore.HealthChecks.UI.InMemory.Storage

builder.Services.AddHealthChecks()
    // Database
    .AddSqlServer(
        connectionString: config.GetConnectionString("SqlServer")!,
        healthQuery: "SELECT 1",
        name: "sql-server",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "db", "ready" },
        timeout: TimeSpan.FromSeconds(5))

    // PostgreSQL alternative
    .AddNpgSql(
        connectionString: config.GetConnectionString("PostgreSQL")!,
        name: "postgresql",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "db", "ready" })

    // Redis
    .AddRedis(
        redisConnectionString: config.GetConnectionString("Redis")!,
        name: "redis",
        failureStatus: HealthStatus.Degraded,
        tags: new[] { "cache", "ready" },
        timeout: TimeSpan.FromSeconds(3))

    // RabbitMQ
    .AddRabbitMQ(
        rabbitConnectionString: "amqp://app:***@10.0.4.10:5672",
        name: "rabbitmq",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "messaging", "ready" })

    // Custom business health check
    .AddCheck<OrderProcessingHealthCheck>(
        "order-processing",
        tags: new[] { "business", "ready" });

// Health Check UI
builder.Services.AddHealthChecksUI(setup =>
{
    setup.SetEvaluationTimeInSeconds(30);
    setup.MaximumHistoryEntriesPerEndpoint(100);
    setup.AddHealthCheckEndpoint("Orders API", "http://localhost:5000/health");
    setup.AddHealthCheckEndpoint("Inventory API", "http://localhost:5001/health");
}).AddInMemoryStorage();

// Endpoints
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false  // No dependency checks — just "is process alive?"
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecksUI(options =>
{
    options.UIPath = "/health-ui";
    options.ApiPath = "/health-api";
});
```

### Custom Health Check

```csharp
public class OrderProcessingHealthCheck : IHealthCheck
{
    private readonly AppDbContext _db;

    public OrderProcessingHealthCheck(AppDbContext db) => _db = db;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, CancellationToken ct = default)
    {
        var stuckOrders = await _db.Orders
            .CountAsync(o =>
                o.Status == OrderStatus.Processing &&
                o.UpdatedAt < DateTime.UtcNow.AddMinutes(-30), ct);

        if (stuckOrders > 100)
            return HealthCheckResult.Unhealthy(
                $"{stuckOrders} orders stuck in processing");

        if (stuckOrders > 10)
            return HealthCheckResult.Degraded(
                $"{stuckOrders} orders processing slowly");

        return HealthCheckResult.Healthy("Order processing nominal");
    }
}
```

### Polly v8 Resilience Patterns

```csharp
// NuGet packages:
// Microsoft.Extensions.Http.Resilience  (v8.10+)
// Microsoft.Extensions.Resilience       (v8.10+)
// Polly.Core                            (v8.5+)

// --- Option A: Standard Resilience Pipeline (recommended) ---
builder.Services.AddHttpClient("orders-api", client =>
{
    client.BaseAddress = new Uri("http://10.0.1.10:5000");
})
.AddStandardResilienceHandler();
// Includes: Rate limiter, Total timeout, Retry, Circuit breaker, Attempt timeout

// --- Option B: Custom Resilience Pipeline ---
builder.Services.AddHttpClient("inventory-api", client =>
{
    client.BaseAddress = new Uri("http://10.0.2.10:5001");
})
.AddResilienceHandler("custom-pipeline", pipeline =>
{
    // 1. Retry with exponential backoff + jitter
    pipeline.AddRetry(new HttpRetryStrategyOptions
    {
        MaxRetryAttempts = 3,
        Delay = TimeSpan.FromMilliseconds(500),
        BackoffType = DelayBackoffType.ExponentialWithJitter,
        UseJitter = true,
        ShouldHandle = new PredicateBuilder<HttpResponseMessage>()
            .HandleResult(r => r.StatusCode == HttpStatusCode.ServiceUnavailable
                            || r.StatusCode == HttpStatusCode.TooManyRequests)
            .Handle<HttpRequestException>()
            .Handle<TimeoutRejectedException>()
    });

    // 2. Circuit Breaker
    pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
    {
        SamplingDuration = TimeSpan.FromSeconds(30),
        FailureRatio = 0.5,         // 50% failure rate triggers break
        MinimumThroughput = 10,      // At least 10 requests in window
        BreakDuration = TimeSpan.FromSeconds(30),
        ShouldHandle = new PredicateBuilder<HttpResponseMessage>()
            .HandleResult(r => (int)r.StatusCode >= 500)
            .Handle<HttpRequestException>()
    });

    // 3. Timeout per attempt
    pipeline.AddTimeout(TimeSpan.FromSeconds(10));
});

// --- Option C: Named Resilience Pipelines (reusable) ---
builder.Services.AddResiliencePipeline("db-retry", builder =>
{
    builder
        .AddRetry(new RetryStrategyOptions
        {
            MaxRetryAttempts = 5,
            Delay = TimeSpan.FromSeconds(1),
            BackoffType = DelayBackoffType.ExponentialWithJitter
        })
        .AddTimeout(TimeSpan.FromSeconds(30));
});

// Usage in services
public class OrderService
{
    private readonly ResiliencePipeline _pipeline;
    private readonly AppDbContext _db;

    public OrderService(
        [FromKeyedServices("db-retry")] ResiliencePipeline pipeline,
        AppDbContext db)
    {
        _pipeline = pipeline;
        _db = db;
    }

    public async Task<Order?> GetOrderWithRetryAsync(int id)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            return await _db.Orders
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id, ct);
        });
    }
}
```

### Resilience Pipeline Visualization

```
Request
  |
  v
+------------------+
| Rate Limiter     |  Block if >N concurrent requests
+--------+---------+
         |
+--------+---------+
| Total Timeout    |  Abort if entire operation exceeds X seconds
+--------+---------+
         |
+--------+---------+
| Retry            |  Retry with exponential backoff + jitter
| (3 attempts)     |  Handles: 5xx, timeout, transient errors
+--------+---------+
         |
+--------+---------+
| Circuit Breaker  |  Open circuit if 50% failures in 30s window
|                  |  Stay open for 30s, then half-open probe
+--------+---------+
         |
+--------+---------+
| Attempt Timeout  |  Abort individual attempt after 10s
+--------+---------+
         |
         v
    HTTP Request
```

---

## 11. Master Architecture Diagram

### Full Production Architecture on Dedicated Servers

```
                                    INTERNET
                                       |
                        +--------------+---------------+
                        |         DNS (Round Robin)    |
                        +--------------+---------------+
                                       |
                        +--------------+---------------+
                        |   Keepalived (VRRP failover) |
                        +---------+----------+---------+
                                  |          |
                           +------+---+ +---+------+
                           | HAProxy  | | HAProxy  |
                           | Primary  | | Standby  |   <-- L4/L7 LB + SSL
                           +------+---+ +---+------+
                                  |
                   +--------------+---------------+
                   |              |               |
            +------+------+ +----+----+    +------+------+
            | YARP        | | YARP    |    | YARP        |
            | Gateway #1  | | GW #2   |    | GW #3       |
            +------+------+ +----+----+    +------+------+
                   |              |               |       Auth, Rate Limit,
                   +--------------+---------------+       Routing, Transforms
                          |       |       |
              +-----------+  +----+---+  ++-----------+
              |              |         |              |
     +--------+------+ +----+-----+ +-+--------+ +---+--------+
     | Orders Service| |Inventory | | Payment  | | Identity   |
     | (x3 instances)| | Service  | | Service  | | Service    |
     |               | | (x2)     | | (x2)     | | (x1)       |
     | ASP.NET Core  | | ASP.NET  | | ASP.NET  | | ASP.NET    |
     | + EF Core     | | + EF Core| | + EF Core| | + EF Core  |
     +-------+-------+ +----+-----+ +----+-----+ +-----+------+
             |               |            |              |
         gRPC (internal)  gRPC         gRPC           REST
             |               |            |
     +-------+-------+ +----+-----+ +----+------+
     |  SQL Server   | |PostgreSQL| |PostgreSQL  |
     |  Primary      | | Primary  | | Primary    |
     |  + Replica(s) | | +Replica | | + Replica  |
     +---------------+ +----------+ +------------+
             |
     +-------+-------+
     | Redis Cluster  |  <-- Distributed cache, session,
     | (3+ nodes)     |      data protection keys
     +-------+-------+
             |
     +-------+-------+
     | RabbitMQ       |  <-- Async messaging between services
     | Cluster (3)    |
     +-------+-------+
             |
     +-------+-------+
     | Monitoring     |  <-- Prometheus + Grafana
     | + Logging      |      Seq / ELK Stack
     +----------------+      OpenTelemetry
```

### Server Allocation Example (Dedicated Servers)

| Server Role | Specs (Minimum) | Quantity | Software |
|-------------|----------------|----------|----------|
| Load Balancer | 4 CPU, 8 GB RAM | 2 (HA pair) | HAProxy + Keepalived |
| API Gateway | 8 CPU, 16 GB RAM | 2-3 | YARP on ASP.NET Core |
| App Server (Orders) | 8 CPU, 32 GB RAM | 3 | ASP.NET Core + EF Core |
| App Server (Inventory) | 8 CPU, 16 GB RAM | 2 | ASP.NET Core + EF Core |
| App Server (Payment) | 4 CPU, 16 GB RAM | 2 | ASP.NET Core + EF Core |
| Database Primary | 16 CPU, 128 GB RAM, NVMe | 1 | SQL Server / PostgreSQL |
| Database Replica | 16 CPU, 64 GB RAM, NVMe | 1-2 | SQL Server / PostgreSQL |
| Redis Cluster | 4 CPU, 32 GB RAM | 3 | Redis 7.x |
| Message Broker | 8 CPU, 16 GB RAM | 3 | RabbitMQ 3.13+ |
| Monitoring | 8 CPU, 32 GB RAM | 1 | Prometheus + Grafana + Seq |

---

## 12. NuGet Package Reference

### Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `Microsoft.EntityFrameworkCore` | 9.0.x | ORM framework |
| `Microsoft.EntityFrameworkCore.SqlServer` | 9.0.x | SQL Server provider |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | 9.0.x | PostgreSQL provider |
| `Microsoft.AspNetCore.OpenApi` | 9.0.x | OpenAPI/Swagger |

### Communication

| Package | Version | Purpose |
|---------|---------|---------|
| `Grpc.AspNetCore` | 2.67+ | gRPC server |
| `Grpc.Net.ClientFactory` | 2.67+ | gRPC client with DI |
| `Google.Protobuf` | 3.28+ | Protocol Buffers |
| `Yarp.ReverseProxy` | 2.2+ | API Gateway / Load Balancer |

### Messaging

| Package | Version | Purpose |
|---------|---------|---------|
| `MassTransit` | 8.2+ | Message bus abstraction |
| `MassTransit.RabbitMQ` | 8.2+ | RabbitMQ transport |
| `MassTransit.Kafka` | 8.2+ | Kafka transport |
| `MassTransit.EntityFrameworkCore` | 8.2+ | Outbox pattern |

### Resilience

| Package | Version | Purpose |
|---------|---------|---------|
| `Microsoft.Extensions.Http.Resilience` | 8.10+ | HTTP resilience (Polly v8) |
| `Microsoft.Extensions.Resilience` | 8.10+ | General resilience pipelines |
| `Polly.Core` | 8.5+ | Core resilience library |

### Health Checks

| Package | Version | Purpose |
|---------|---------|---------|
| `AspNetCore.HealthChecks.SqlServer` | 8.0.2 | SQL Server health |
| `AspNetCore.HealthChecks.NpgSql` | 8.0.2 | PostgreSQL health |
| `AspNetCore.HealthChecks.Redis` | 8.0.1 | Redis health |
| `AspNetCore.HealthChecks.RabbitMQ` | 8.0.2 | RabbitMQ health |
| `AspNetCore.HealthChecks.UI` | 8.0.2 | Health check dashboard |

### CQRS / DDD

| Package | Version | Purpose |
|---------|---------|---------|
| `MediatR` | 12.4+ | Mediator / CQRS |
| `FluentValidation.DependencyInjectionExtensions` | 11.10+ | Validation pipeline |
| `Marten` | 7.x | PostgreSQL event store |

### Caching

| Package | Version | Purpose |
|---------|---------|---------|
| `Microsoft.Extensions.Caching.StackExchangeRedis` | 9.0.x | Redis distributed cache |
| `StackExchange.Redis` | 2.8+ | Redis client |

### Observability

| Package | Version | Purpose |
|---------|---------|---------|
| `OpenTelemetry.Extensions.Hosting` | 1.10+ | Telemetry integration |
| `OpenTelemetry.Exporter.Prometheus` | 1.10+ | Prometheus metrics |
| `Serilog.AspNetCore` | 8.0+ | Structured logging |
| `Serilog.Sinks.Seq` | 8.0+ | Seq log server sink |

---

## 13. Recommendations & Decision Matrix

### Architecture Decision Framework

| Factor | Recommendation | Why |
|--------|---------------|-----|
| **Starting Architecture** | Modular Monolith | Simplicity, speed, evolve later |
| **Database** | PostgreSQL (primary) + SQL Server (ERP) | Cost, features, EF Core support |
| **ORM** | EF Core 9 with compiled queries + pooling | Performance, maturity, .NET native |
| **API Gateway** | YARP 2.x | Microsoft-backed, .NET native, performant |
| **Load Balancer** | HAProxy (L4) + Nginx (L7) or YARP alone | Dedicated server proven stack |
| **Internal Comms** | gRPC (services) + REST (public API) | 5-10x perf gain internally |
| **Message Broker** | RabbitMQ + MassTransit | Simpler ops, good .NET support |
| **Event Streaming** | Apache Kafka (when needed) | High-throughput, replay capability |
| **Caching** | Redis Cluster | Session, cache, data protection |
| **Resilience** | Polly v8 via Microsoft.Extensions | Circuit breakers, retries, timeouts |
| **Health Checks** | AspNetCore.HealthChecks.* | Comprehensive, UI dashboard |
| **Observability** | OpenTelemetry + Prometheus + Grafana | Industry standard, free |
| **Logging** | Serilog + Seq | Structured logging, searchable |

### Scaling Roadmap

```
Phase 1: FOUNDATION (Month 1-3)
  [x] Modular Monolith with EF Core 9
  [x] DbContext pooling + compiled queries
  [x] Redis distributed cache
  [x] Health checks on all dependencies
  [x] Polly resilience on all HTTP clients
  [x] Serilog structured logging

Phase 2: HORIZONTAL SCALING (Month 3-6)
  [x] HAProxy/Nginx load balancing (2+ app instances)
  [x] Data Protection key sharing via Redis
  [x] Externalize all session state
  [x] Database read replicas for queries
  [x] CQRS with separate read/write paths

Phase 3: SERVICE EXTRACTION (Month 6-12)
  [ ] Identify hot modules via monitoring data
  [ ] Extract first service with gRPC
  [ ] Add RabbitMQ for async events
  [ ] MassTransit Outbox for reliability
  [ ] YARP API Gateway for routing

Phase 4: ADVANCED SCALING (Month 12+)
  [ ] Kafka for event streaming (if needed)
  [ ] Database sharding (if >1TB or >50K TPS)
  [ ] Multi-region deployment
  [ ] Event Sourcing for audit-critical domains
  [ ] Auto-scaling based on metrics
```

### Performance Targets

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| API response time (p95) | <100 ms | Compiled queries, caching, gRPC |
| Throughput | >10,000 req/s | Horizontal scaling, Kestrel tuning |
| Database connection usage | <70% pool | Connection pooling, PgBouncer |
| Error rate | <0.1% | Circuit breakers, retries, health checks |
| Availability | 99.9%+ | HA load balancers, multiple app instances |
| Cold start time | <2 seconds | Compiled models, AOT (where applicable) |

---

## Sources

- [Horizontally Scaling ASP.NET Core APIs With YARP](https://www.milanjovanovic.tech/blog/horizontally-scaling-aspnetcore-apis-with-yarp-load-balancing)
- [Building Modular Monoliths with .NET 8](https://www.asmak9.com/2025/09/building-modular-monoliths-with-net-8.html)
- [Microservices vs Monoliths: Architecture Decision Framework 2025](https://medium.com/@kittikawin_ball/microservices-vs-monoliths-architecture-decision-framework-for-2025-98c8ff2ec484)
- [HAProxy vs NGINX: Which Load Balancer in 2026](https://1gbits.com/blog/haproxy-vs-nginx/)
- [ASP.NET Core Proxy/Load Balancer Configuration](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer)
- [DbContext Pooling in .NET 8](https://medium.com/@serhatalftkn/dbcontext-pooling-in-net-8-a-deep-dive-into-performance-optimization-9e7af6f480f0)
- [EF Core Compiled Queries Performance](https://bytecrafted.dev/posts/ef-core/compiled-queries-performance/)
- [CQRS and Event Sourcing with .NET 8](https://medium.com/@oubaich/implementing-cqrs-and-event-sourcing-with-net-8-966ba5416f48)
- [MassTransit and RabbitMQ in .NET](https://developersvoice.com/blog/dotnet/masstransit-rabbitmq-fault-tolerant-dotnet-microservices/)
- [API Gateway Comparison: Ocelot vs YARP vs Kong 2025](https://www.elysiate.com/blog/api-gateway-comparison-ocelot-vs-yarp-vs-kong)
- [YARP Production Guide .NET 8 2025](https://www.elysiate.com/blog/yarp-reverse-proxy-production-guide-dotnet)
- [gRPC vs REST Benchmarks 2025](https://markaicode.com/grpc-vs-rest-benchmarks-2025/)
- [Building Resilient Cloud Services with .NET 8](https://devblogs.microsoft.com/dotnet/building-resilient-cloud-services-with-dotnet-8/)
- [Polly v8 Circuit Breaker Strategy](https://www.pollydocs.org/strategies/circuit-breaker.html)
- [Polly v8 Resilience in .NET 8](https://www.dotnet-guide.com/tutorials/cloud-native/polly-resilience/)
- [What's New in EF Core 9](https://learn.microsoft.com/en-us/ef/core/what-is-new/ef-core-9.0/whatsnew)
- [.NET 9 Performance Improvements](https://abp.io/community/articles/.net-9-performance-improvements-summary-gmww3gl8)
- [Scaling EF Core with Distributed Caching](https://dzone.com/articles/scaling-entity-framework-core-apps-with-distribute)
- [Distributed Caching in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/performance/caching/distributed)
- [Nginx Load Balancing for .NET WebApi](https://event-driven.io/en/setting_up_nginx_with_aspnet/)
- [Kestrel Reverse Proxy Guidance](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel/when-to-use-a-reverse-proxy)
