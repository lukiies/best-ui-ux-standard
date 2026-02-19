# Database Scaling Strategies for EF Core Applications

## Status: RESEARCHED (Feb 2026)
## Scope: Massive Data Volumes, High Concurrency, Enterprise ERP/Reporting

---

## Table of Contents

1. [Read Replicas and Write/Read Splitting](#1-read-replicas-and-writeread-splitting)
2. [Database Sharding](#2-database-sharding)
3. [Connection Pool Optimization](#3-connection-pool-optimization)
4. [Query Performance](#4-query-performance)
5. [Caching Layers](#5-caching-layers)
6. [Database Migration Strategies](#6-database-migration-strategies)
7. [Time-Series Data and Archiving](#7-time-series-data-and-archiving)
8. [Architecture Recommendations](#8-architecture-recommendations)

---

## 1. Read Replicas and Write/Read Splitting

### 1.1 Architecture Overview

Read/write splitting routes SELECT queries to read replicas and INSERT/UPDATE/DELETE
to the primary server. This is the single most impactful scaling strategy for
read-heavy enterprise applications (ERP dashboards, reporting, retail catalog browsing).

```
                    ┌─────────────────┐
                    │  Load Balancer   │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │  ASP.NET Core   │
                    │  Application    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────┴──────┐  ┌───┴────┐  ┌──────┴───────┐
     │  Primary (RW)  │  │Replica1│  │  Replica 2   │
     │  PostgreSQL    │  │  (RO)  │  │    (RO)      │
     └───────────────┘  └────────┘  └──────────────┘
```

### 1.2 PostgreSQL Streaming Replication with Npgsql

Npgsql 7.0+ has **built-in** support for multi-host connections and read/write
splitting, making it the cleanest approach for EF Core + PostgreSQL.

**Connection String with Multiple Hosts:**
```
Host=primary-server,replica1,replica2;
Database=mydb;
Username=app;
Password=secret;
Target Session Attributes=prefer-standby;
Load Balance Hosts=true
```

**EF Core Configuration with Npgsql Multi-Host Data Source:**
```csharp
// Program.cs — Register separate data sources for read/write
var primaryConnStr = "Host=primary;Database=mydb;Username=app;Password=secret;" +
                     "Target Session Attributes=primary";
var replicaConnStr = "Host=primary,replica1,replica2;Database=mydb;Username=app;Password=secret;" +
                     "Target Session Attributes=prefer-standby;Load Balance Hosts=true";

// Primary context for writes
builder.Services.AddDbContextPool<AppDbContext>(opt =>
    opt.UseNpgsql(primaryConnStr));

// Read-only context for queries
builder.Services.AddDbContextPool<ReadOnlyDbContext>(opt =>
    opt.UseNpgsql(replicaConnStr));
```

**Read-Only DbContext:**
```csharp
public class ReadOnlyDbContext : AppDbContext
{
    public ReadOnlyDbContext(DbContextOptions<ReadOnlyDbContext> options)
        : base(options) { }

    public override int SaveChanges()
        => throw new InvalidOperationException("This context is read-only.");

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
        => throw new InvalidOperationException("This context is read-only.");
}
```

**Npgsql Target Session Attributes (Built-in Routing):**

| Attribute | Routes To |
|-----------|-----------|
| `Primary` | Primary only (writes) |
| `Standby` | Standby only (reads) |
| `PreferStandby` | Standby if available, primary fallback |
| `PreferPrimary` | Primary if available, standby fallback |
| `ReadWrite` | Server accepting writes |
| `ReadOnly` | Server in read-only mode |
| `Any` | Any available server |

**Advanced: EF Core Interceptor for Automatic Routing:**
```csharp
public class ReadWriteRoutingInterceptor : DbCommandInterceptor
{
    private readonly string _readConnectionString;
    private readonly string _writeConnectionString;

    public ReadWriteRoutingInterceptor(
        string readConnectionString, string writeConnectionString)
    {
        _readConnectionString = readConnectionString;
        _writeConnectionString = writeConnectionString;
    }

    public override InterceptionResult<DbDataReader> ReaderExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result)
    {
        if (IsReadOperation(command.CommandText))
        {
            RouteTo(command, _readConnectionString);
        }
        return result;
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        if (IsReadOperation(command.CommandText))
        {
            RouteTo(command, _readConnectionString);
        }
        return ValueTask.FromResult(result);
    }

    private static bool IsReadOperation(string sql)
    {
        var trimmed = sql.TrimStart();
        return trimmed.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("WITH", StringComparison.OrdinalIgnoreCase);
    }

    private static void RouteTo(DbCommand command, string connectionString)
    {
        if (command.Connection?.State == System.Data.ConnectionState.Closed)
        {
            command.Connection.ConnectionString = connectionString;
        }
    }
}
```

> **Recommendation:** Prefer the dual-context approach (ReadOnlyDbContext vs AppDbContext)
> over interceptor-based routing. It is explicit, testable, and avoids SQL parsing fragility.
> Npgsql's built-in `Target Session Attributes` handles the actual connection routing.

### 1.3 SQL Server Always On Availability Groups

SQL Server uses `ApplicationIntent=ReadOnly` in the connection string to route
read traffic to secondary replicas via the AG Listener.

**Connection Strings:**
```csharp
// Write connection — routes to primary
var writeConnStr = "Server=AGListener;Database=MyDb;" +
                   "Integrated Security=SSPI;";

// Read connection — routes to secondary replica
var readConnStr = "Server=AGListener;Database=MyDb;" +
                  "Integrated Security=SSPI;" +
                  "ApplicationIntent=ReadOnly;";
```

**EF Core Configuration:**
```csharp
builder.Services.AddDbContextPool<AppDbContext>(opt =>
    opt.UseSqlServer(writeConnStr));

builder.Services.AddDbContextPool<ReadOnlyDbContext>(opt =>
    opt.UseSqlServer(readConnStr));
```

**SQL Server Read-Only Routing Configuration:**
```sql
-- Configure read-only routing on the primary replica
ALTER AVAILABILITY GROUP [MyAG]
MODIFY REPLICA ON N'Server1' WITH (
    PRIMARY_ROLE (
        ALLOW_CONNECTIONS = READ_WRITE,
        READ_ONLY_ROUTING_LIST = (N'Server2', N'Server3')
    ),
    SECONDARY_ROLE (
        ALLOW_CONNECTIONS = READ_ONLY,
        READ_ONLY_ROUTING_URL = N'TCP://Server1.domain.com:1433'
    )
);

ALTER AVAILABILITY GROUP [MyAG]
MODIFY REPLICA ON N'Server2' WITH (
    SECONDARY_ROLE (
        ALLOW_CONNECTIONS = READ_ONLY,
        READ_ONLY_ROUTING_URL = N'TCP://Server2.domain.com:1433'
    )
);
```

> **SQL Server 2025 Note:** SQL Server 2025 introduces TDS 8.0 with strict TLS 1.3
> enforcement for AG listener connections.

### 1.4 CQRS Integration with Read/Write Splitting

```csharp
// Command handler uses write context
public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, int>
{
    private readonly AppDbContext _db;
    public CreateOrderHandler(AppDbContext db) => _db = db;

    public async Task<int> Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        var order = new Order { /* ... */ };
        _db.Orders.Add(order);
        await _db.SaveChangesAsync(ct);
        return order.Id;
    }
}

// Query handler uses read-only context
public class GetOrdersHandler : IRequestHandler<GetOrdersQuery, List<OrderDto>>
{
    private readonly ReadOnlyDbContext _db;
    public GetOrdersHandler(ReadOnlyDbContext db) => _db = db;

    public async Task<List<OrderDto>> Handle(GetOrdersQuery query, CancellationToken ct)
    {
        return await _db.Orders
            .AsNoTracking()
            .Where(o => o.TenantId == query.TenantId)
            .Select(o => new OrderDto(o.Id, o.Total, o.CreatedAt))
            .ToListAsync(ct);
    }
}
```

---

## 2. Database Sharding

### 2.1 Sharding Strategies for Multi-Tenant ERP

| Strategy | When to Use | Complexity |
|----------|-------------|------------|
| **Column discriminator** | < 100 tenants, shared schema | Low |
| **Database-per-tenant** | Strict data isolation, compliance | Medium |
| **Schema-per-tenant** | Moderate isolation, single DB | Medium (not EF Core native) |
| **Hash-based sharding** | Even distribution, high throughput | High |
| **Range-based sharding** | Geographic/date-based separation | Medium |

### 2.2 Tenant-Based Sharding with EF Core

**Tenant Service:**
```csharp
public interface ITenantService
{
    string TenantId { get; }
    string GetConnectionString();
    void SetTenant(string tenantId);
}

public class TenantService : ITenantService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IConfiguration _config;

    public TenantService(IHttpContextAccessor httpContextAccessor, IConfiguration config)
    {
        _httpContextAccessor = httpContextAccessor;
        _config = config;
    }

    public string TenantId =>
        _httpContextAccessor.HttpContext?.Request.Headers["X-Tenant-Id"]
            .FirstOrDefault()
        ?? throw new InvalidOperationException("Tenant ID not found in request.");

    public string GetConnectionString()
    {
        var connStr = _config.GetConnectionString(TenantId);
        if (string.IsNullOrEmpty(connStr))
            throw new InvalidOperationException($"No connection string for tenant: {TenantId}");
        return connStr;
    }

    public void SetTenant(string tenantId) { /* For background jobs */ }
}
```

**Dynamic DbContext Configuration (Database-per-Tenant):**
```csharp
public class TenantDbContext : DbContext
{
    private readonly ITenantService _tenantService;
    private readonly IConfiguration _configuration;

    public TenantDbContext(
        DbContextOptions<TenantDbContext> opts,
        ITenantService tenantService,
        IConfiguration configuration)
        : base(opts)
    {
        _tenantService = tenantService;
        _configuration = configuration;
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        var connectionStr = _tenantService.GetConnectionString();
        optionsBuilder.UseNpgsql(connectionStr);
    }

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Product> Products => Set<Product>();
}
```

**Registration:**
```csharp
// appsettings.json
{
  "ConnectionStrings": {
    "TenantA": "Host=shard1;Database=tenant_a;...",
    "TenantB": "Host=shard2;Database=tenant_b;...",
    "TenantC": "Host=shard1;Database=tenant_c;..."
  }
}

// Program.cs
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddDbContext<TenantDbContext>(ServiceLifetime.Scoped);
```

### 2.3 Global Query Filter Approach (Single Database)

For simpler multi-tenancy where all tenants share one database:

```csharp
public class SharedDbContext : DbContext
{
    private readonly string _tenantId;

    public SharedDbContext(
        DbContextOptions<SharedDbContext> opts,
        ITenantService tenantService)
        : base(opts)
    {
        _tenantId = tenantService.TenantId;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply global query filter for tenant isolation
        modelBuilder.Entity<Order>()
            .HasQueryFilter(o => o.TenantId == _tenantId);
        modelBuilder.Entity<Product>()
            .HasQueryFilter(p => p.TenantId == _tenantId);
        modelBuilder.Entity<Customer>()
            .HasQueryFilter(c => c.TenantId == _tenantId);
    }
}
```

### 2.4 DbContext Pool with Tenant State (Production Pattern)

For high-performance multi-tenancy with context pooling:

```csharp
// Singleton pooled factory
builder.Services.AddPooledDbContextFactory<TenantDbContext>(
    o => o.UseNpgsql(defaultConnStr));

// Scoped factory that injects tenant
public class TenantScopedFactory : IDbContextFactory<TenantDbContext>
{
    private readonly IDbContextFactory<TenantDbContext> _pooledFactory;
    private readonly string _tenantId;

    public TenantScopedFactory(
        IDbContextFactory<TenantDbContext> pooledFactory,
        ITenantService tenantService)
    {
        _pooledFactory = pooledFactory;
        _tenantId = tenantService.TenantId;
    }

    public TenantDbContext CreateDbContext()
    {
        var context = _pooledFactory.CreateDbContext();
        context.TenantId = _tenantId;
        return context;
    }
}

builder.Services.AddScoped<TenantScopedFactory>();
builder.Services.AddScoped(sp =>
    sp.GetRequiredService<TenantScopedFactory>().CreateDbContext());
```

---

## 3. Connection Pool Optimization

### 3.1 EF Core DbContext Pooling

**Basic Configuration:**
```csharp
// Replace AddDbContext with AddDbContextPool
builder.Services.AddDbContextPool<AppDbContext>(
    opt => opt.UseNpgsql(connectionString),
    poolSize: 1024);  // Default is 1024
```

**Microsoft Benchmark Results:**

| Method | Mean | Allocated |
|--------|------|-----------|
| WithoutContextPooling | 701.6 us | 50.38 KB |
| WithContextPooling | 350.1 us | 4.63 KB |

**Result: 2x faster, 10x less memory allocation.**

**Without DI (Background Services, Console Apps):**
```csharp
var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseNpgsql(connectionString)
    .Options;

var factory = new PooledDbContextFactory<AppDbContext>(options, poolSize: 256);

// Use in background worker
using var context = factory.CreateDbContext();
var results = await context.Orders.ToListAsync();
```

**Key Rules for Pooled Contexts:**
- `OnConfiguring` runs only ONCE (first instance creation)
- Context state must be set AFTER retrieval from pool
- Do not store request-scoped state in DbContext fields without resetting
- Always use the scoped factory pattern for multi-tenant scenarios

### 3.2 Npgsql Connection Pool Configuration

**Npgsql Connection String Parameters:**
```
Host=db-server;
Database=mydb;
Username=app;
Password=secret;
Minimum Pool Size=10;
Maximum Pool Size=100;
Connection Idle Lifetime=300;
Connection Pruning Interval=10;
Keepalive=30;
Tcp Keepalive=true;
```

| Parameter | Default | Recommended | Purpose |
|-----------|---------|-------------|---------|
| `Minimum Pool Size` | 0 | 10-25 | Pre-warm connections |
| `Maximum Pool Size` | 100 | 50-200* | Upper bound |
| `Connection Idle Lifetime` | 300s | 300s | Prune stale connections |
| `Connection Pruning Interval` | 10s | 10s | How often to check |
| `Keepalive` | 0 | 30 | Send keepalive to prevent timeout |

*Max pool size formula: `num_cores * 2 + effective_spindle_count` (PostgreSQL wiki)

**Connection Lifecycle:**
```
Open() → Pool check → Idle connection exists?
  ├─ YES → Reset & return pooled connection
  └─ NO → Pool < MaxPoolSize?
       ├─ YES → Create new physical connection
       └─ NO → Wait (up to Connection Timeout)
```

### 3.3 PgBouncer (External Connection Pooler)

Use PgBouncer when you have **multiple application instances** connecting to
the same PostgreSQL cluster.

**PgBouncer pgbouncer.ini Configuration:**
```ini
[databases]
mydb = host=primary-server port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Pool modes: session | transaction | statement
pool_mode = transaction

; Pool sizing
default_pool_size = 50
min_pool_size = 10
max_client_conn = 1000
reserve_pool_size = 5
reserve_pool_timeout = 3

; Timeouts
server_idle_timeout = 600
client_idle_timeout = 0
query_timeout = 120

; Logging
log_connections = 1
log_disconnections = 1
stats_period = 60
```

**Pool Mode Selection:**

| Mode | Description | Best For |
|------|-------------|----------|
| `session` | Connection held for session lifetime | Long transactions, LISTEN/NOTIFY |
| `transaction` | Connection returned after each transaction | Most web apps (default choice) |
| `statement` | Connection returned after each statement | Simple read-only workloads |

> **Recommendation:** Use `transaction` mode for ERP/reporting applications.
> Use `session` mode only when using PostgreSQL-specific features like
> prepared statements, advisory locks, or LISTEN/NOTIFY.

### 3.4 SQL Server Connection Pool Tuning

```csharp
// SQL Server connection string with pool settings
var connStr = "Server=sql-server;Database=MyDb;" +
    "Min Pool Size=10;" +
    "Max Pool Size=200;" +
    "Connection Lifetime=300;" +    // Force recycling after 5 min
    "Connection Timeout=30;" +
    "Encrypt=True;" +
    "TrustServerCertificate=False;";
```

---

## 4. Query Performance

### 4.1 EF Core Compiled Queries

Compiled queries eliminate LINQ expression tree parsing overhead. Benchmarks
show 15-30% improvement for simple queries, more for complex ones.

**Static Compiled Query Pattern:**
```csharp
public static class OrderQueries
{
    // Synchronous compiled query
    public static readonly Func<AppDbContext, int, Order?> GetById =
        EF.CompileQuery(
            (AppDbContext ctx, int id) =>
                ctx.Orders.FirstOrDefault(o => o.Id == id));

    // Async compiled query
    public static readonly Func<AppDbContext, int, Task<Order?>> GetByIdAsync =
        EF.CompileAsyncQuery(
            (AppDbContext ctx, int id) =>
                ctx.Orders.FirstOrDefault(o => o.Id == id));

    // Compiled query returning collection
    public static readonly Func<AppDbContext, string, IAsyncEnumerable<Order>>
        GetByTenant = EF.CompileAsyncQuery(
            (AppDbContext ctx, string tenantId) =>
                ctx.Orders.Where(o => o.TenantId == tenantId));

    // Complex compiled query with includes
    public static readonly Func<AppDbContext, int, Task<Order?>>
        GetWithDetails = EF.CompileAsyncQuery(
            (AppDbContext ctx, int id) =>
                ctx.Orders
                    .Include(o => o.Items)
                    .Include(o => o.Customer)
                    .FirstOrDefault(o => o.Id == id));
}

// Usage
var order = await OrderQueries.GetByIdAsync(dbContext, orderId);

await foreach (var o in OrderQueries.GetByTenant(dbContext, "tenant-123"))
{
    // Process each order
}
```

**Microsoft Benchmark Results (Compiled vs Non-Compiled):**

| Method | NumBlogs | Mean | Allocated |
|--------|----------|------|-----------|
| WithCompiledQuery | 1 | 564.2 us | 9 KB |
| WithoutCompiledQuery | 1 | 671.6 us | 13 KB |
| WithCompiledQuery | 10 | 645.3 us | 13 KB |
| WithoutCompiledQuery | 10 | 709.8 us | 18 KB |

### 4.2 EF Core 10 Precompiled Queries (Experimental - .NET 10)

EF Core 10 (Nov 2025, LTS) introduced precompiled queries that perform
LINQ-to-SQL translation at build time. This eliminates startup costs entirely.

```bash
# Generate compiled model with precompiled queries
dotnet ef dbcontext optimize --output-dir CompiledModels --namespace MyApp.CompiledModels
```

```csharp
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    => optionsBuilder
        .UseModel(CompiledModels.AppDbContextModel.Instance)
        .UseNpgsql(connectionString);
```

**Performance Impact:**
- Startup time reduced by 60-80% (compiled models)
- Runtime query overhead approaching Dapper-level performance
- .NET 10 overall: 25-50% better in benchmark metrics vs .NET 9

> **Important:** NativeAOT precompiled queries are still experimental in EF Core 10.
> Production deployment of AOT-compiled EF applications is not yet recommended.

### 4.3 Split Queries

Split queries prevent "Cartesian explosion" when loading multiple collections.

```csharp
// Single query (default) — can produce massive result sets
var orders = await context.Orders
    .Include(o => o.Items)          // 1:N
    .Include(o => o.Payments)       // 1:N
    .Include(o => o.StatusHistory)  // 1:N
    .ToListAsync();
// WARNING: N items * M payments * P history rows = Cartesian product!

// Split query — separate SQL per collection
var orders = await context.Orders
    .Include(o => o.Items)
    .Include(o => o.Payments)
    .Include(o => o.StatusHistory)
    .AsSplitQuery()   // ← Generates 4 separate SQL statements
    .ToListAsync();

// Global default (per DbContext)
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    => optionsBuilder
        .UseNpgsql(connStr, o => o.UseQuerySplittingBehavior(
            QuerySplittingBehavior.SplitQuery));
```

**When to Use Split Queries:**

| Scenario | Single Query | Split Query |
|----------|-------------|-------------|
| 1 collection Include | Preferred | Not needed |
| 2+ collection Includes | Risk of explosion | Preferred |
| Small datasets (< 1000 rows) | Preferred | Overhead not worth it |
| Large datasets + multiple 1:N | Avoid | Strongly preferred |
| Consistency requirements | Preferred (single snapshot) | Weaker (multiple roundtrips) |

> **Warning (2026 finding):** Split queries can be SLOWER in high-throughput scenarios
> because they create multiple roundtrips. Always benchmark under production-like load.
> See: "Why Split Queries Made Our EF Core App Slower" (Medium, Jan 2026).

### 4.4 Raw SQL for Complex Reports

For complex analytical queries, raw SQL or Dapper outperforms LINQ translation.

**EF Core Raw SQL (Mapped Types):**
```csharp
// FromSqlRaw — mapped to entity type
var topProducts = await context.Products
    .FromSqlRaw(@"
        SELECT p.*
        FROM products p
        JOIN order_items oi ON oi.product_id = p.id
        GROUP BY p.id
        HAVING SUM(oi.quantity) > {0}
        ORDER BY SUM(oi.quantity) DESC
        LIMIT 100", minimumQuantity)
    .AsNoTracking()
    .ToListAsync();

// FromSqlInterpolated — parameterized (SQL injection safe)
var report = await context.Database
    .SqlQueryRaw<SalesReportDto>(@"
        SELECT
            DATE_TRUNC('month', o.created_at) AS month,
            t.name AS tenant_name,
            COUNT(o.id) AS order_count,
            SUM(o.total) AS total_revenue,
            AVG(o.total) AS avg_order_value
        FROM orders o
        JOIN tenants t ON t.id = o.tenant_id
        WHERE o.created_at >= {0} AND o.created_at < {1}
        GROUP BY DATE_TRUNC('month', o.created_at), t.name
        ORDER BY month, total_revenue DESC",
        startDate, endDate)
    .ToListAsync();
```

**Hybrid Approach (EF Core + Dapper for Reports):**
```csharp
// Install: dotnet add package Dapper
public class ReportRepository
{
    private readonly IDbConnection _connection;

    public ReportRepository(IConfiguration config)
    {
        _connection = new NpgsqlConnection(
            config.GetConnectionString("ReadOnly"));
    }

    public async Task<IEnumerable<SalesReportDto>> GetMonthlySalesAsync(
        string tenantId, DateTime from, DateTime to)
    {
        const string sql = @"
            SELECT
                DATE_TRUNC('month', o.created_at) AS Month,
                COUNT(*) AS OrderCount,
                SUM(o.total) AS TotalRevenue,
                AVG(o.total) AS AvgOrderValue
            FROM orders o
            WHERE o.tenant_id = @TenantId
              AND o.created_at >= @From
              AND o.created_at < @To
            GROUP BY DATE_TRUNC('month', o.created_at)
            ORDER BY Month";

        return await _connection.QueryAsync<SalesReportDto>(
            sql, new { TenantId = tenantId, From = from, To = to });
    }
}
```

**2025 Performance Comparison (ORM Showdown):**

| Operation | EF Core 9 | Dapper | Raw ADO.NET |
|-----------|-----------|--------|-------------|
| Single row fetch | 1.0x | 1.2x faster | 1.3x faster |
| Bulk read (1000 rows) | 1.0x | 1.5-2x faster | 2x faster |
| Complex aggregate | 1.0x | 3-5x faster | 5-10x faster |
| Insert (single) | 1.0x | Similar | Similar |

> **Recommendation:** Use EF Core for CRUD, Dapper for complex reporting queries.
> "EF Core by default, Dapper by exception — governed by benchmarks, not intuition."

### 4.5 Database Indexing Strategies

**EF Core Fluent API Index Configuration:**
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // Simple index
    modelBuilder.Entity<Order>()
        .HasIndex(o => o.CreatedAt);

    // Composite index (column order matters!)
    modelBuilder.Entity<Order>()
        .HasIndex(o => new { o.TenantId, o.CreatedAt })
        .HasDatabaseName("IX_Orders_Tenant_Created");

    // Unique index
    modelBuilder.Entity<Product>()
        .HasIndex(p => new { p.TenantId, p.Sku })
        .IsUnique();

    // Covering index (PostgreSQL) — eliminates key lookups
    modelBuilder.Entity<Order>()
        .HasIndex(o => new { o.TenantId, o.Status })
        .IncludeProperties(o => new { o.Total, o.CreatedAt })
        .HasDatabaseName("IX_Orders_TenantStatus_Cover");

    // Filtered/partial index
    modelBuilder.Entity<Order>()
        .HasIndex(o => o.CreatedAt)
        .HasFilter("[Status] = 'Pending'")
        .HasDatabaseName("IX_Orders_Pending");

    // Descending index for recent-first queries
    modelBuilder.Entity<Order>()
        .HasIndex(o => o.CreatedAt)
        .IsDescending();

    // GIN index for full-text search (PostgreSQL)
    modelBuilder.Entity<Product>()
        .HasIndex(p => p.SearchVector)
        .HasMethod("GIN");
}
```

**Indexing Rules of Thumb:**
1. **Always index foreign keys** — EF Core does NOT auto-create FK indexes
2. **Index columns in WHERE clauses** with high cardinality
3. **Composite index column order:** Most selective column first
4. **Covering indexes** for hot read paths (eliminates key lookups)
5. **Avoid over-indexing** — each index slows INSERT/UPDATE/DELETE
6. **Monitor with EXPLAIN ANALYZE** (PostgreSQL) or Execution Plans (SQL Server)

**PostgreSQL Execution Plan Analysis:**
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders
WHERE tenant_id = 'abc' AND created_at > '2025-01-01'
ORDER BY created_at DESC
LIMIT 50;
```

---

## 5. Caching Layers

### 5.1 Architecture: Multi-Level Caching

```
┌──────────────────────────────────────────────┐
│                Application                    │
│  ┌──────────────────────────────────────┐    │
│  │ L1: In-Memory (HybridCache/IMemory) │    │
│  │ Latency: < 1ms                       │    │
│  └──────────────┬───────────────────────┘    │
│                 │ Cache Miss                  │
│  ┌──────────────┴───────────────────────┐    │
│  │ L2: Redis (Distributed)              │    │
│  │ Latency: 1-5ms                       │    │
│  └──────────────┬───────────────────────┘    │
│                 │ Cache Miss                  │
│  ┌──────────────┴───────────────────────┐    │
│  │ L3: Database (PostgreSQL/SQL Server) │    │
│  │ Latency: 5-50ms+                     │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
         │ Backplane (Redis Pub/Sub)
         ▼ Invalidation across all nodes
```

### 5.2 EF Core Second-Level Cache

**Installation and Configuration:**
```bash
dotnet add package EFCoreSecondLevelCacheInterceptor
dotnet add package EFCoreSecondLevelCacheInterceptor.StackExchange.Redis
```

```csharp
// Program.cs
builder.Services.AddEFSecondLevelCache(options =>
{
    options.UseStackExchangeRedisCacheProvider(redisConnStr)
           .UseCacheKeyPrefix("EF_")
           .DisableLogging(true)
           .CacheAllQueries(CacheExpirationMode.Absolute, TimeSpan.FromMinutes(5));
});

builder.Services.AddDbContextPool<AppDbContext>((sp, options) =>
{
    options.UseNpgsql(connectionString)
           .AddInterceptors(
               sp.GetRequiredService<SecondLevelCacheInterceptor>());
});
```

**Query-Level Cache Control:**
```csharp
// Cache specific query for 10 minutes
var featuredProducts = await context.Products
    .Where(p => p.IsFeatured)
    .Cacheable(CacheExpirationMode.Absolute, TimeSpan.FromMinutes(10))
    .ToListAsync();

// Sliding expiration for frequently accessed data
var categories = await context.Categories
    .AsNoTracking()
    .Cacheable(CacheExpirationMode.Sliding, TimeSpan.FromHours(1))
    .ToListAsync();

// Skip cache for this query
var freshData = await context.Orders
    .Where(o => o.Status == OrderStatus.Pending)
    .ToListAsync();  // No .Cacheable() = always hits DB
```

**Cache Invalidation:**
- **Automatic:** SaveChanges/SaveChangesAsync triggers invalidation for affected tables
- **Limitation:** `ExecuteUpdate()` and `ExecuteDelete()` bypass interceptors (manual invalidation needed)

### 5.3 HybridCache + Redis Pub/Sub (Distributed Invalidation)

For multi-node deployments (.NET 9+):

**Cache Invalidator Service:**
```csharp
public interface ICacheInvalidator
{
    Task InvalidateAsync(string key, CancellationToken ct = default);
}

public class RedisCacheInvalidator : ICacheInvalidator
{
    private static readonly RedisChannel Channel =
        RedisChannel.Literal("cache-invalidation");
    private readonly IConnectionMultiplexer _redis;

    public RedisCacheInvalidator(IConnectionMultiplexer redis)
        => _redis = redis;

    public async Task InvalidateAsync(string key, CancellationToken ct = default)
    {
        var subscriber = _redis.GetSubscriber();
        await subscriber.PublishAsync(Channel, new RedisValue(key));
    }
}
```

**Background Listener:**
```csharp
public class CacheInvalidationService : BackgroundService
{
    private static readonly RedisChannel Channel =
        RedisChannel.Literal("cache-invalidation");
    private readonly IConnectionMultiplexer _redis;
    private readonly HybridCache _cache;

    public CacheInvalidationService(
        IConnectionMultiplexer redis, HybridCache cache)
    {
        _redis = redis;
        _cache = cache;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var subscriber = _redis.GetSubscriber();
        await subscriber.SubscribeAsync(Channel, (channel, value) =>
        {
            string key = value.ToString();
            var task = _cache.RemoveAsync(key, stoppingToken);
            if (!task.IsCompleted)
                task.GetAwaiter().GetResult();
        });
    }
}
```

**Registration:**
```csharp
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(redisConnStr));
builder.Services.AddHybridCache();
builder.Services.AddSingleton<ICacheInvalidator, RedisCacheInvalidator>();
builder.Services.AddHostedService<CacheInvalidationService>();
```

### 5.4 FusionCache (Recommended Production Alternative)

FusionCache provides built-in backplane support, eliminating manual Pub/Sub wiring:

```csharp
// Install: dotnet add package ZiggyCreatures.FusionCache
//          dotnet add package ZiggyCreatures.FusionCache.Backplane.StackExchangeRedis

builder.Services.AddFusionCache()
    .WithBackplane(
        new RedisBackplane(new RedisBackplaneOptions
        {
            Configuration = redisConnStr
        }))
    .AsHybridCache();  // Compatible with .NET HybridCache interface
```

### 5.5 Redis Cluster vs Redis Sentinel

| Feature | Redis Sentinel | Redis Cluster |
|---------|---------------|---------------|
| **Purpose** | High availability | HA + Horizontal scaling |
| **Data distribution** | Single master | 16,384 hash slots across nodes |
| **Max data size** | Single server RAM | Aggregate cluster RAM |
| **Write scaling** | No (single master) | Yes (multiple masters) |
| **Setup complexity** | Low-Medium | Medium-High |
| **Multi-key operations** | Full support | Only if keys on same slot |
| **Minimum nodes** | 3 Sentinels + 1 master + 1 replica | 6 (3 masters + 3 replicas) |

**Recommendation for ERP/Reporting:**
- **Start with Sentinel** for caching workloads under ~25 GB
- **Graduate to Cluster** when data exceeds single-node RAM or write throughput
  becomes a bottleneck
- Many enterprises use **Sentinel for session/cache + Cluster for heavy analytics**

---

## 6. Database Migration Strategies

### 6.1 Zero-Downtime Migrations: The Expand/Contract Pattern

The most critical rule: **Decouple schema migration from application deployment.**
Never auto-apply migrations on app startup in production.

**Phase 1: EXPAND (Additive, backward-compatible changes)**
```csharp
// Migration: Add new column (nullable — backward compatible)
public partial class AddMiddleNameToCustomer : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "MiddleName",
            table: "Customers",
            type: "text",
            nullable: true);  // Must be nullable for backward compat
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "MiddleName",
            table: "Customers");
    }
}
```

**Phase 2: MIGRATE (Data transformation)**
```csharp
// Migration: Backfill data if needed
public partial class BackfillMiddleName : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            UPDATE ""Customers""
            SET ""MiddleName"" = ''
            WHERE ""MiddleName"" IS NULL;
        ");
    }
}
```

**Phase 3: CONTRACT (Remove old schema)**
```csharp
// Migration: Make column required (only after all app instances updated)
public partial class MakeMiddleNameRequired : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<string>(
            name: "MiddleName",
            table: "Customers",
            type: "text",
            nullable: false,
            defaultValue: "");
    }
}
```

### 6.2 Deployment Sequence

```
Step 1: Apply EXPAND migration to database
        (both old and new app versions work)
           ↓
Step 2: Deploy new application version
        (uses new column, writes to both old/new)
           ↓
Step 3: Verify all instances running new version
           ↓
Step 4: Apply MIGRATE migration (backfill data)
           ↓
Step 5: Apply CONTRACT migration
        (remove old column or add constraints)
```

### 6.3 Rename Column (Zero-Downtime Pattern)

Renaming a column is a breaking change. Use expand/contract:

```csharp
// Step 1: EXPAND — Add new column + sync trigger
public partial class ExpandRenameEmail : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Add new column
        migrationBuilder.AddColumn<string>(
            name: "EmailAddress",
            table: "Customers",
            type: "text",
            nullable: true);

        // Copy existing data
        migrationBuilder.Sql(@"
            UPDATE ""Customers"" SET ""EmailAddress"" = ""Email"";
        ");

        // Create trigger to keep both columns in sync
        migrationBuilder.Sql(@"
            CREATE OR REPLACE FUNCTION sync_email_columns()
            RETURNS TRIGGER AS $$
            BEGIN
                IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
                    IF NEW.""EmailAddress"" IS DISTINCT FROM NEW.""Email"" THEN
                        NEW.""EmailAddress"" = COALESCE(NEW.""EmailAddress"", NEW.""Email"");
                        NEW.""Email"" = NEW.""EmailAddress"";
                    END IF;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER trg_sync_email
            BEFORE INSERT OR UPDATE ON ""Customers""
            FOR EACH ROW EXECUTE FUNCTION sync_email_columns();
        ");
    }
}

// Step 2: Deploy new app version using EmailAddress
// Step 3: CONTRACT — Drop old column + trigger
public partial class ContractRenameEmail : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP TRIGGER trg_sync_email ON \"Customers\";");
        migrationBuilder.Sql("DROP FUNCTION sync_email_columns();");
        migrationBuilder.DropColumn(name: "Email", table: "Customers");
    }
}
```

### 6.4 Blue-Green Database Deployments

```
┌─────────────┐     ┌────────────────┐     ┌─────────────┐
│ Load Balancer│────▶│  Blue (v1.0)   │────▶│  Database    │
│              │     │  App Instances  │     │  (Shared)    │
│              │     └────────────────┘     │              │
│              │                             │  Schema is   │
│              │     ┌────────────────┐     │  always      │
│              │─ ─ ▶│  Green (v1.1)  │────▶│  backward-   │
│              │     │  App Instances  │     │  compatible  │
└─────────────┘     └────────────────┘     └─────────────┘
```

**Key Principle:** The database schema must ALWAYS be backward-compatible
because during deployment, both Blue and Green environments access it simultaneously.

### 6.5 Migration Execution (Production)

```bash
# NEVER: Auto-migrate on startup
# ALWAYS: Run as separate CI/CD step

# Generate migration script
dotnet ef migrations script --idempotent --output migrate.sql

# Review the generated SQL before applying
# Apply with your preferred tool (psql, sqlcmd, flyway, etc.)
psql -h db-server -d mydb -f migrate.sql
```

---

## 7. Time-Series Data and Archiving

### 7.1 TimescaleDB for Metrics and Audit Logs

TimescaleDB extends PostgreSQL with hypertables for automatic time-based partitioning.

**Installation and Setup:**
```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create regular table first
CREATE TABLE metrics (
    time        TIMESTAMPTZ NOT NULL,
    tenant_id   TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value       DOUBLE PRECISION NOT NULL,
    tags        JSONB
);

-- Convert to hypertable (auto-partitions by time)
SELECT create_hypertable('metrics', by_range('time'));

-- Optional: Add space partitioning by tenant
SELECT add_dimension('metrics', by_hash('tenant_id', 4));
```

**Continuous Aggregates (Real-Time Materialized Views):**
```sql
-- Pre-compute hourly averages
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    tenant_id,
    metric_name,
    AVG(value) AS avg_value,
    MAX(value) AS max_value,
    MIN(value) AS min_value,
    COUNT(*) AS sample_count
FROM metrics
GROUP BY bucket, tenant_id, metric_name;

-- Refresh policy (auto-refresh materialized data)
SELECT add_continuous_aggregate_policy('metrics_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset   => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour'
);
```

**Compression (90%+ Storage Reduction):**
```sql
-- Enable compression
ALTER TABLE metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'tenant_id, metric_name',
    timescaledb.compress_orderby = 'time DESC'
);

-- Auto-compress data older than 7 days
SELECT add_compression_policy('metrics', INTERVAL '7 days');
```

**Data Retention Policy:**
```sql
-- Automatically drop data older than 12 months
SELECT add_retention_policy('metrics', INTERVAL '12 months');

-- For continuous aggregates, keep summaries longer
SELECT add_retention_policy('metrics_hourly', INTERVAL '5 years');
```

**Performance Benchmark:**
- 1 billion rows: 89 GB in plain PostgreSQL -> 8.7 GB with TimescaleDB compression
- Time-range queries on hypertables: 10-100x faster via chunk exclusion

### 7.2 PostgreSQL Native Partitioning (Without TimescaleDB)

For environments where TimescaleDB is not available:

**Declarative Range Partitioning:**
```sql
-- Create partitioned table
CREATE TABLE audit_logs (
    id          BIGSERIAL,
    tenant_id   TEXT NOT NULL,
    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   TEXT NOT NULL,
    payload     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)  -- partition key must be in PK
) PARTITION BY RANGE (created_at);

-- Create partitions per month
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... repeat per month

-- Create indexes on each partition (concurrent, non-blocking)
CREATE INDEX CONCURRENTLY idx_audit_2025_01_tenant
    ON audit_logs_2025_01 (tenant_id, created_at);
```

**Automated Partition Management with pg_partman:**
```sql
CREATE EXTENSION pg_partman;

SELECT partman.create_parent(
    p_parent_table := 'public.audit_logs',
    p_control := 'created_at',
    p_type := 'native',
    p_interval := '1 month',
    p_premake := 3  -- Create partitions 3 months in advance
);

-- Auto-maintenance (run via pg_cron)
SELECT cron.schedule('partition-maintenance', '0 3 * * *',
    $$SELECT partman.run_maintenance()$$);
```

**Archiving Old Partitions:**
```sql
-- Detach old partition (instant, metadata-only)
ALTER TABLE audit_logs DETACH PARTITION audit_logs_2024_01;

-- Export to CSV before dropping
COPY audit_logs_2024_01 TO '/archive/audit_logs_2024_01.csv' WITH CSV HEADER;

-- Or move to cheaper tablespace
ALTER TABLE audit_logs_2024_01 SET TABLESPACE archive_storage;

-- Or drop to reclaim space (instant)
DROP TABLE audit_logs_2024_01;
```

**Key Benefits:**
- Dropping a partition is **instant** (metadata operation, no row-by-row delete)
- No autovacuum bloat from bulk deletes
- Partition pruning speeds up queries (only relevant partitions scanned)
- Individual partition backup/restore

### 7.3 EF Core Integration with Partitioned Tables

```csharp
// Entity mapping — EF Core works transparently with partitioned tables
modelBuilder.Entity<AuditLog>(entity =>
{
    entity.ToTable("audit_logs");
    entity.HasKey(e => new { e.Id, e.CreatedAt }); // Composite PK including partition key

    entity.HasIndex(e => new { e.TenantId, e.CreatedAt });
    entity.HasIndex(e => new { e.EntityType, e.EntityId, e.CreatedAt });
});

// Query — PostgreSQL automatically routes to correct partition
var recentLogs = await context.AuditLogs
    .Where(l => l.TenantId == tenantId
             && l.CreatedAt > DateTime.UtcNow.AddDays(-30))
    .OrderByDescending(l => l.CreatedAt)
    .Take(100)
    .AsNoTracking()
    .ToListAsync();
```

### 7.4 Data Retention Policy Implementation

```csharp
// Background service for data lifecycle management
public class DataRetentionService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<DataRetentionService> _logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Archive orders older than 2 years
            var archiveDate = DateTime.UtcNow.AddYears(-2);

            // Move to archive table (raw SQL for performance)
            await db.Database.ExecuteSqlRawAsync(@"
                INSERT INTO orders_archive
                SELECT * FROM orders
                WHERE created_at < {0}
                  AND archived_at IS NULL
                LIMIT 10000",  // Batch to avoid long transactions
                archiveDate);

            await db.Database.ExecuteSqlRawAsync(@"
                DELETE FROM orders
                WHERE created_at < {0}
                  AND id IN (
                    SELECT id FROM orders_archive
                    WHERE created_at < {0}
                    ORDER BY created_at
                    LIMIT 10000
                )",
                archiveDate);

            _logger.LogInformation("Data retention job completed");

            // Run daily at 3 AM
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
```

---

## 8. Architecture Recommendations

### 8.1 Recommended Database Scaling Progression

```
Phase 1: Single Server (< 100K users)
├── EF Core + DbContext Pooling
├── Proper indexing
├── Compiled queries for hot paths
├── Application-level caching (HybridCache)
└── Vertical scaling (more RAM, SSD)

Phase 2: Read Scaling (100K-1M users)
├── Add read replicas (1-3)
├── Npgsql multi-host / SQL Server AG
├── ReadOnlyDbContext pattern
├── Redis distributed cache
├── PgBouncer for connection pooling
└── EF Core Second-Level Cache

Phase 3: Write Scaling (1M+ users)
├── Tenant-based database sharding
├── CQRS with separate read/write stores
├── Message queues for async writes
├── TimescaleDB for time-series data
└── Data archiving and partitioning

Phase 4: Global Scale (10M+ users)
├── Multi-region replicas
├── Redis Cluster
├── CDN for static/cached API responses
├── Event sourcing for audit-critical domains
└── Dedicated reporting database
```

### 8.2 Connection String Management Pattern

```csharp
// appsettings.json
{
  "Database": {
    "Primary": "Host=primary;Database=mydb;Username=app;Password=secret;Maximum Pool Size=100;Minimum Pool Size=10",
    "ReadReplicas": "Host=primary,replica1,replica2;Database=mydb;Username=app;Password=secret;Target Session Attributes=prefer-standby;Load Balance Hosts=true;Maximum Pool Size=50",
    "Reporting": "Host=reporting-replica;Database=mydb;Username=readonly;Password=secret;Command Timeout=300;Maximum Pool Size=20",
    "Redis": "redis-server:6379,ssl=true,abortConnect=false",
    "TimescaleDB": "Host=timescale-server;Database=metrics;Username=metrics;Password=secret"
  }
}
```

### 8.3 Performance Targets for Enterprise Applications

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Simple CRUD query | < 50ms | EF Core logging |
| Complex report query | < 2s | Execution plans |
| API response (cached) | < 10ms | Application metrics |
| API response (DB hit) | < 200ms | Application metrics |
| Connection pool utilization | < 80% | PgBouncer/driver stats |
| Cache hit ratio | > 85% | Redis INFO |
| P99 latency | < 500ms | APM tool |
| Database CPU | < 70% | Server monitoring |

### 8.4 Monitoring Checklist

- [ ] EF Core logging with `EnableSensitiveDataLogging` (dev only)
- [ ] Slow query log (PostgreSQL: `log_min_duration_statement = 200`)
- [ ] Connection pool saturation alerts
- [ ] Redis cache hit/miss ratios
- [ ] Database replication lag monitoring
- [ ] Partition size and count tracking
- [ ] Index usage statistics (`pg_stat_user_indexes`)
- [ ] Query plan changes (plan regression detection)

---

## Sources

### Read Replicas & Write Splitting
- [Npgsql Multiple Hosts, Failover and Load Balancing](https://www.npgsql.org/doc/failover-and-load-balancing.html)
- [EF Core Interceptors — Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/logging-events-diagnostics/interceptors)
- [SQL Server Always On Availability Groups](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/overview-of-always-on-availability-groups-sql-server)
- [How To Use EF Core Interceptors — Milan Jovanovic](https://www.milanjovanovic.tech/blog/how-to-use-ef-core-interceptors)

### Sharding & Multi-Tenancy
- [EF Core Multi-tenancy — Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/miscellaneous/multitenancy)
- [Sharding Multi-Tenant Apps with EF Core — The Reformed Programmer](https://www.thereformedprogrammer.net/part6-using-sharding-to-build-multi-tenant-apps-using-asp-net-core-and-ef-core/)
- [Multi-Tenant Applications With EF Core — Milan Jovanovic](https://www.milanjovanovic.tech/blog/multi-tenant-applications-with-ef-core)
- [Multi-Tenant SaaS Architecture Guide 2025](https://www.lktechacademy.com/2025/10/multi-tenant-saas-architecture-database-per-tenant.html)

### Connection Pooling
- [Advanced Performance Topics — Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/performance/advanced-performance-topics)
- [DbContext Pooling in .NET 8 — Serhat Alaftekin](https://medium.com/@serhatalftkn/dbcontext-pooling-in-net-8-a-deep-dive-into-performance-optimization-9e7af6f480f0)
- [PostgreSQL Performance with PgBouncer](https://opstree.com/blog/2025/10/07/postgresql-performance-with-pgbouncer/)
- [Npgsql Connection Pooling](https://deepwiki.com/npgsql/npgsql/3.1-connection-pooling)

### Query Performance
- [EF Core Performance Tuning 2025](https://nhonvo.github.io/posts/2025-09-06-ef-core-performance-tuning/)
- [EF Core Compiled Queries — ByteCrafted](https://bytecrafted.dev/posts/ef-core/compiled-queries-performance/)
- [Split Queries — Chris Woodruff](https://www.woodruff.dev/split-queries-stop-the-data-traffic-jam-in-ef-core/)
- [Why Split Queries Made Our EF Core App Slower — Kerim Kara](https://medium.com/@kerimkkara/why-split-queries-made-our-ef-core-app-slower-3db762a90852)
- [The ORM Performance Showdown 2025](https://developersvoice.com/blog/database/orm-showdown-2025/)
- [Optimize EF Core Queries 2026](https://oneuptime.com/blog/post/2026-01-28-optimize-entity-framework-core-queries/view)
- [Using EF Core Like a Pro: .NET 8-10](https://medium.com/dotnet-new/using-ef-core-like-a-pro-performance-patterns-and-modern-features-in-net-8-10-63d458ba3064)

### Caching
- [EFCoreSecondLevelCacheInterceptor — GitHub](https://github.com/VahidN/EFCoreSecondLevelCacheInterceptor)
- [EF Core Second-Level Caching 2025](https://nhonvo.github.io/posts/2025-09-07-ef-core-second-level-caching/)
- [Distributed Cache Invalidation with Redis and HybridCache — Milan Jovanovic](https://www.milanjovanovic.tech/blog/solving-the-distributed-cache-invalidation-problem-with-redis-and-hybridcache)
- [Redis Cache Invalidation 2026](https://oneuptime.com/blog/post/2026-01-25-redis-cache-invalidation/view)
- [Redis Sentinel vs Redis Cluster — Baeldung](https://www.baeldung.com/redis-sentinel-vs-clustering)
- [Redis Sentinel vs Redis Cluster 2025 — Aditya Baldwa](https://medium.com/@adityabaldwa/redis-sentinal-vs-redis-cluster-scaling-redis-the-right-way-db04e44f6f64)

### Migrations
- [Zero-Downtime Database Migrations with EF Core 2026](https://medium.com/@kittikawin_ball/zero-downtime-database-migrations-with-ef-core-d9fcff7e74aa)
- [Zero-Downtime Deployments with EF — Jon Leigh](https://jonleigh.me/zero-downtime-deploys-with-entity-framework-migrations/)
- [Expand and Contract Pattern 2025 — Jasmin Fluri](https://medium.com/@jasminfluri/expand-and-contract-method-for-database-changes-414d236f236f)
- [Zero Downtime Deployments with EntityFramework — Mews](https://developers.mews.com/zero-downtime-deployments-with-entityframework/)

### Time-Series & Archiving
- [TimescaleDB Guide — TechPrescient](https://www.techprescient.com/blogs/timescaledb/)
- [TimescaleDB Data Retention Policies — Sling Academy](https://www.slingacademy.com/article/timescaledb-understanding-time-series-data-retention-policies-in-postgresql/)
- [Data Archiving in PostgreSQL 2025 — Data Egret](https://dataegret.com/2025/05/data-archiving-and-retention-in-postgresql-best-practices-for-large-datasets/)
- [PostgreSQL Table Partitioning — Official Docs](https://www.postgresql.org/docs/current/ddl-partitioning.html)

### EF Core 9/10 Features
- [What's New in EF Core 9 — Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/what-is-new/ef-core-9.0/whatsnew)
- [What's New in EF Core 10 — Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/what-is-new/ef-core-10.0/whatsnew)
- [EF Core 10 Precompiled Queries — Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/performance/nativeaot-and-precompiled-queries)
- [EF Core 10 Faster Production Queries — elmah.io](https://blog.elmah.io/new-in-net-10-and-c-14-ef-core-10s-faster-production-queries/)
- [Database Indexing in .NET with EF Core](https://adrianbailador.github.io/blog/30-database-indexing-in-net/)
