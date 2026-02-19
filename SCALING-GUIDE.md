# Scaling Guide — Enterprise Web Applications on Dedicated Servers

**Building fully scalable solutions with .NET / EF Core on dedicated infrastructure, prepared for cluster expansion as performance demands grow.**

> Research conducted February 2026. Covers .NET 8/9/10, EF Core 9/10, Kubernetes, Docker, PostgreSQL, Redis, and the complete observability stack.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Scaling Phases — Growth Roadmap](#scaling-phases)
4. [Application Architecture](#application-architecture)
5. [Database Scaling](#database-scaling)
6. [Caching Strategy](#caching-strategy)
7. [Production Monitoring & Observability](#production-monitoring)
8. [Container Orchestration & Deployment](#container-orchestration)
9. [Load Testing & Performance Benchmarking](#load-testing)
10. [Performance Optimization Checklist](#performance-checklist)
11. [Detailed Research Reports](#detailed-reports)
12. [MVP Performance Solution](#mvp-performance-solution)

---

## Executive Summary

This guide addresses a critical question for enterprise applications: **How to build and maintain a web application (with its own API and UI) that serves large companies with massive data volumes and thousands of concurrent users — while remaining performant and responsive at all times.**

### Key Conclusions

| Domain | Recommended Approach |
|--------|---------------------|
| **Architecture** | Start with Modular Monolith, extract microservices only when monitoring data demands it |
| **API Gateway** | YARP 2.x (Microsoft-backed, .NET native, superior performance) |
| **Load Balancing** | HAProxy (L4) + Nginx (L7) for dedicated servers |
| **Database** | PostgreSQL + Npgsql multi-host for read replicas; EF Core DbContext pooling + compiled queries |
| **Caching** | Multi-layer: HybridCache (.NET 9) → Redis Cluster → Database |
| **Message Queue** | MassTransit over RabbitMQ (task queues) or Kafka (event streaming) |
| **Monitoring** | OpenTelemetry → Prometheus + Grafana + Jaeger + Serilog/Seq |
| **Container Orchestration** | k3s for ≤10 nodes; Kubernetes (kubeadm) for larger clusters |
| **Load Testing** | k6 (primary) + NBomber (.NET-native scenarios) |
| **Resilience** | Polly v8 with Microsoft.Extensions.Http.Resilience |
| **Internal Communication** | gRPC (5-10x faster than REST for service-to-service) |
| **Real-time** | SignalR + Redis backplane; SSE as lightweight alternative |

---

## Architecture Overview

```
                     ┌─────────────────────────────────────────────────────────┐
                     │                    INTERNET / CLIENTS                    │
                     │     Browsers, Mobile Apps, Third-party Integrations      │
                     └──────────────────────┬──────────────────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────────────────┐
                     │              DNS (Round Robin / GeoDNS)                  │
                     └──────────────────────┬───────────────────────────────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          ▼                                   ▼
                 ┌─────────────────┐                ┌─────────────────┐
                 │   HAProxy VIP   │   Keepalived   │   HAProxy VIP   │
                 │   (Primary)     │◄──────────────►│   (Standby)     │
                 │   L4 TCP/SSL    │                │   L4 TCP/SSL    │
                 └────────┬────────┘                └────────┬────────┘
                          │                                   │
              ┌───────────┼───────────┐                      │
              ▼           ▼           ▼                      │
     ┌──────────┐ ┌──────────┐ ┌──────────┐                │
     │  Nginx   │ │  Nginx   │ │  Nginx   │  (L7 Reverse   │
     │  Node 1  │ │  Node 2  │ │  Node 3  │   Proxy, TLS,  │
     │          │ │          │ │          │   Compression)  │
     └────┬─────┘ └────┬─────┘ └────┬─────┘                │
          │             │             │                      │
          ▼             ▼             ▼                      │
     ┌──────────────────────────────────────┐               │
     │         YARP API Gateway             │               │
     │   (Rate limiting, routing, health)   │               │
     └──────────────────┬───────────────────┘               │
                        │                                    │
         ┌──────────────┼──────────────┐                    │
         ▼              ▼              ▼                     │
   ┌───────────┐ ┌───────────┐ ┌───────────┐              │
   │ .NET API  │ │ .NET API  │ │ .NET API  │              │
   │ Instance 1│ │ Instance 2│ │ Instance N│              │
   │           │ │           │ │           │              │
   │ EF Core   │ │ EF Core   │ │ EF Core   │              │
   │ SignalR   │ │ SignalR   │ │ SignalR   │              │
   │ OTel SDK  │ │ OTel SDK  │ │ OTel SDK  │              │
   └─────┬─────┘ └─────┬─────┘ └─────┬─────┘              │
         │              │              │                     │
    ┌────┴──────────────┴──────────────┴────┐               │
    │                                        │               │
    ▼                                        ▼               │
┌──────────────────┐              ┌──────────────────────┐  │
│   PostgreSQL     │              │    Redis Cluster      │  │
│   Primary        │              │    (Cache, Sessions,  │  │
│   ┌────────────┐ │              │     Pub/Sub, SignalR  │  │
│   │ Read       │ │              │     Backplane)        │  │
│   │ Replica 1  │ │              └──────────────────────┘  │
│   │ Replica 2  │ │                                        │
│   └────────────┘ │              ┌──────────────────────┐  │
└──────────────────┘              │    RabbitMQ Cluster   │  │
                                  │    (Async processing, │  │
                                  │     Outbox pattern)   │  │
                                  └──────────────────────┘  │
                                                             │
    ┌────────────────────────────────────────────────────────┘
    │            MONITORING STACK
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  Prometheus ──► Grafana (Dashboards + Alerting)          │
│  OTel Collector ──► Jaeger (Distributed Tracing)         │
│  Serilog ──► Seq / Elasticsearch (Structured Logging)    │
│  Node Exporter + cAdvisor (Infrastructure Metrics)       │
│  Alertmanager ──► PagerDuty / OpsGenie (Incident Mgmt)  │
└──────────────────────────────────────────────────────────┘
```

---

## Scaling Phases

### Phase 1: Foundation (< 100K users, 1-3 servers)

| Component | Setup |
|-----------|-------|
| **App** | Single ASP.NET Core instance with EF Core |
| **Database** | Single PostgreSQL server |
| **Cache** | In-memory (IMemoryCache) |
| **Proxy** | Nginx as reverse proxy |
| **Monitoring** | Prometheus + Grafana basics |
| **Orchestration** | Docker Compose or systemd |

**Key optimizations at this phase:**
- DbContext pooling (`AddDbContextPool`)
- Compiled queries for hot paths (30-70% faster)
- Proper database indexing (cover queries, composite indexes)
- Response caching middleware
- Gzip/Brotli compression

### Phase 2: Horizontal Scaling (100K–1M users, 3-10 servers)

| Component | Upgrade |
|-----------|---------|
| **App** | 3-5 instances behind HAProxy/Nginx |
| **Database** | Primary + 2 read replicas (Npgsql multi-host) |
| **Cache** | Redis Sentinel (3 nodes) + HybridCache |
| **Message Queue** | RabbitMQ (via MassTransit) |
| **Monitoring** | Full OTel + Jaeger + Seq |
| **Orchestration** | Docker Swarm or k3s |
| **API Gateway** | YARP with health checks |

**Key additions:**
- Read/write splitting via ReadOnlyDbContext pattern
- PgBouncer for connection pooling
- EF Core second-level cache (EFCoreSecondLevelCacheInterceptor)
- Distributed sessions in Redis
- SignalR with Redis backplane
- Health checks for all dependencies

### Phase 3: Service Extraction (1M+ users, 10-30 servers)

| Component | Upgrade |
|-----------|---------|
| **Architecture** | Extract high-traffic modules to microservices |
| **Database** | Tenant-based sharding; CQRS with separate read/write stores |
| **Cache** | Redis Cluster (6+ nodes) |
| **Communication** | gRPC for internal, REST for external |
| **Queue** | Kafka for event streaming |
| **Orchestration** | Kubernetes (kubeadm) |
| **CI/CD** | ArgoCD (GitOps) with blue-green/canary deployments |

**Key additions:**
- Service mesh (Linkerd) for mTLS and observability
- KEDA for event-driven autoscaling
- TimescaleDB for time-series/audit data
- Outbox pattern for transactional messaging
- Chaos engineering (Polly Simmy + LitmusChaos)

### Phase 4: Global Scale (10M+ users, 30+ servers, multi-region)

| Component | Upgrade |
|-----------|---------|
| **Database** | Multi-region replicas; dedicated reporting database |
| **Cache** | Redis Cluster per region |
| **CDN** | Cloudflare/Fastly or self-hosted Varnish |
| **Communication** | Event sourcing for audit-critical domains |
| **Orchestration** | Multi-cluster Kubernetes with federation |

---

## Application Architecture

### Modular Monolith (Recommended Starting Point)

The 2025-2026 consensus is clear: **start with a Modular Monolith** rather than microservices. Each module has:
- Its own EF Core `DbContext` (schema isolation)
- Public API surface (module-to-module communication)
- Independent domain logic (bounded context)

When monitoring reveals a specific module is a bottleneck, extract it as a microservice. This is data-driven architecture evolution, not premature optimization.

### Key NuGet Packages for Scalability

```xml
<!-- Core -->
<PackageReference Include="Microsoft.EntityFrameworkCore" Version="9.*" />
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.*" />

<!-- Caching -->
<PackageReference Include="Microsoft.Extensions.Caching.Hybrid" Version="9.*" />
<PackageReference Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="9.*" />

<!-- Resilience -->
<PackageReference Include="Microsoft.Extensions.Http.Resilience" Version="9.*" />
<PackageReference Include="Polly.Extensions" Version="8.*" />

<!-- Messaging -->
<PackageReference Include="MassTransit.RabbitMQ" Version="8.*" />
<PackageReference Include="MassTransit.EntityFrameworkCore" Version="8.*" />

<!-- API Gateway -->
<PackageReference Include="Yarp.ReverseProxy" Version="2.*" />

<!-- Health Checks -->
<PackageReference Include="AspNetCore.HealthChecks.NpgSql" Version="9.*" />
<PackageReference Include="AspNetCore.HealthChecks.Redis" Version="9.*" />
<PackageReference Include="AspNetCore.HealthChecks.UI" Version="9.*" />

<!-- Monitoring -->
<PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.*" />
<PackageReference Include="OpenTelemetry.Exporter.Prometheus.AspNetCore" Version="1.*" />
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.*" />
<PackageReference Include="Serilog.AspNetCore" Version="8.*" />
<PackageReference Include="Serilog.Sinks.Seq" Version="8.*" />

<!-- gRPC -->
<PackageReference Include="Grpc.AspNetCore" Version="2.*" />

<!-- Load Testing (.NET native) -->
<PackageReference Include="NBomber" Version="6.*" />
<PackageReference Include="BenchmarkDotNet" Version="0.14.*" />
```

### Critical Code Patterns

**DbContext Pooling + Compiled Queries:**
```csharp
// Program.cs
builder.Services.AddDbContextPool<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
    {
        npgsql.EnableRetryOnFailure(3);
        npgsql.CommandTimeout(30);
    }), poolSize: 1024);

// Compiled query (30-70% faster for hot paths)
public static readonly Func<AppDbContext, int, Task<Invoice?>> GetInvoiceById =
    EF.CompileAsyncQuery((AppDbContext ctx, int id) =>
        ctx.Invoices
            .AsNoTracking()
            .Include(i => i.Lines)
            .FirstOrDefault(i => i.Id == id));
```

**HybridCache (18x performance improvement):**
```csharp
builder.Services.AddHybridCache(options =>
{
    options.DefaultEntryOptions = new HybridCacheEntryOptions
    {
        Expiration = TimeSpan.FromMinutes(5),
        LocalCacheExpiration = TimeSpan.FromMinutes(1)
    };
});

// Usage
var invoice = await hybridCache.GetOrCreateAsync(
    $"invoice:{id}",
    async ct => await db.Invoices.FindAsync(id, ct),
    tags: ["invoices"]);
```

**Resilience Pipeline (Polly v8):**
```csharp
builder.Services.AddHttpClient("ExternalApi")
    .AddStandardResilienceHandler(options =>
    {
        options.Retry.MaxRetryAttempts = 3;
        options.Retry.Delay = TimeSpan.FromMilliseconds(500);
        options.CircuitBreaker.FailureRatio = 0.5;
        options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(10);
        options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(3);
        options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(30);
    });
```

---

## Database Scaling

### Read/Write Splitting (Npgsql Multi-Host)

```
Primary Connection:
Host=primary;Database=app;Maximum Pool Size=100;Minimum Pool Size=10

Read Replica Connection:
Host=primary,replica1,replica2;Database=app;
Target Session Attributes=prefer-standby;Load Balance Hosts=true;
Maximum Pool Size=50
```

### Scaling Progression

| Phase | Users | Strategy |
|-------|-------|----------|
| 1 | < 100K | Single server, indexing, compiled queries, DbContext pooling |
| 2 | 100K-1M | Add 1-3 read replicas, PgBouncer, Redis cache |
| 3 | 1M+ | Tenant-based sharding, CQRS, message queues, TimescaleDB |
| 4 | 10M+ | Multi-region replicas, Redis Cluster, dedicated reporting DB |

### Performance Targets

| Metric | Target |
|--------|--------|
| Simple CRUD query | < 50ms |
| Complex report query | < 2s |
| API response (cached) | < 10ms |
| API response (DB hit) | < 200ms |
| Connection pool utilization | < 80% |
| Cache hit ratio | > 85% |
| P99 latency | < 500ms |

> Full database scaling report: [.claude/pre-requisites/efcore-database-scaling-report.md](.claude/pre-requisites/efcore-database-scaling-report.md)

---

## Caching Strategy

### Multi-Layer Architecture

```
Layer 1: Browser Cache (Cache-Control headers)
    ↓ miss
Layer 2: CDN / Nginx (static assets, Brotli/gzip)
    ↓ miss
Layer 3: Application (HybridCache — memory L1 + Redis L2)
    ↓ miss
Layer 4: Database (materialized views, query cache)
```

### Cache-Control Header Guide

| Resource Type | Header |
|--------------|--------|
| Fingerprinted assets (JS/CSS) | `public, max-age=31536000, immutable` |
| Images | `public, max-age=2592000` (30 days) |
| HTML pages | `public, max-age=0, must-revalidate` + ETag |
| API (public data) | `public, max-age=60, stale-while-revalidate=300` |
| Sensitive data | `no-store, no-cache, must-revalidate, private` |

### Redis Topology Guide

| Scale | Topology | Nodes |
|-------|----------|-------|
| Small (< 25GB) | Redis Sentinel | 3 Sentinel + 1 master + 1 replica |
| Medium (25-100GB) | Redis Cluster | 6 nodes (3 master + 3 replica) |
| Large (100GB+) | Redis Cluster | 12+ nodes across regions |

---

## Production Monitoring

### Observability Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| **Metrics** | Prometheus + Grafana | Time-series metrics, dashboards, alerting |
| **Traces** | OpenTelemetry + Jaeger | Distributed request tracing |
| **Logs** | Serilog + Seq/ELK | Structured logging with trace correlation |
| **Infrastructure** | Node Exporter + cAdvisor | Server and container metrics |
| **Database** | postgres_exporter | PostgreSQL query performance |
| **Alerting** | Alertmanager + PagerDuty | Incident notification and escalation |
| **Frontend** | OpenTelemetry Browser SDK | Real User Monitoring (RUM) |

### Key Metrics to Monitor

| Category | Metric | Warning | Critical |
|----------|--------|---------|----------|
| **Latency** | P95 response time | > 500ms | > 2s |
| **Latency** | P99 response time | > 1s | > 5s |
| **Errors** | HTTP 5xx rate | > 1% | > 5% |
| **Throughput** | Requests/second drop | > 20% drop | > 50% drop |
| **CPU** | Server CPU usage | > 70% | > 85% |
| **Memory** | Available memory | < 25% | < 15% |
| **GC** | GC pause time | > 5% of wall time | > 10% |
| **Thread Pool** | Queue length | > 50 | > 100 |
| **DB Connections** | Pool utilization | > 70% | > 90% |
| **DB Replication** | Replication lag | > 10s | > 30s |
| **Cache** | Redis memory usage | > 70% maxmemory | > 85% |
| **Disk** | Disk I/O utilization | > 70% | > 90% |

### Deployment Order for Monitoring

1. **Phase 1:** Prometheus + Grafana + Node Exporter + cAdvisor
2. **Phase 2:** OpenTelemetry SDK in .NET apps + Prometheus scraping
3. **Phase 3:** OTel Collector + Jaeger for distributed tracing
4. **Phase 4:** Serilog → Seq (dev) + Elasticsearch (prod) + Loki (Grafana-native)
5. **Phase 5:** Alertmanager + PagerDuty/OpsGenie + runbooks
6. **Phase 6:** OpenTelemetry Browser SDK for frontend RUM
7. **Phase 7:** Database-specific monitoring (postgres_exporter)

> Full monitoring report: [.claude/pre-requisites/dotnet-monitoring-observability-report.md](.claude/pre-requisites/dotnet-monitoring-observability-report.md)

---

## Container Orchestration

### Orchestrator Selection

| Scale | Orchestrator | Why |
|-------|-------------|-----|
| 1-3 servers | Docker Compose / Swarm | Simplest, minimal overhead |
| 3-10 servers | k3s | Lightweight K8s, single binary, includes Traefik |
| 10+ servers | Kubernetes (kubeadm) | Full K8s, Cilium CNI, maximum flexibility |

### Deployment Strategies

| Strategy | Risk | Rollback Speed | Resource Cost |
|----------|------|----------------|---------------|
| Rolling Update | Medium | Slow (roll forward) | Low (no extra replicas) |
| Blue-Green | Low | Instant (switch) | High (double resources) |
| Canary | Very Low | Fast (abort) | Medium (10-25% extra) |

### Auto-Scaling

- **HPA** for CPU/memory-based scaling (baseline)
- **KEDA** for event-driven scaling (queue depth, custom Prometheus metrics)
- **VPA** in "Off" mode for resource recommendations only

### Storage on Bare Metal

| Scale | Solution |
|-------|----------|
| Small-Medium | Longhorn (Helm one-liner, 200-400MB/node) |
| Enterprise | Rook-Ceph (block + object + file, 1-2GB/node) |
| High-Performance NVMe | OpenEBS Mayastor (lowest latency) |

> Full orchestration report: [.claude/topics/dotnet-container-orchestration.md](.claude/topics/dotnet-container-orchestration.md)

---

## Load Testing

### Tool Recommendations

| Role | Tool | Why |
|------|------|-----|
| Primary API testing | **k6** (Grafana) | Go runtime, JS scripting, CI/CD thresholds, Grafana integration |
| .NET-native scenarios | **NBomber** v6 | C# debugging, multi-step flows, distributed agents |
| Database testing | **JMeter** | JDBC sampler, broadest protocol support |
| Micro-benchmarks | **BenchmarkDotNet** | Cross-runtime comparison, statistically rigorous |

### CI/CD Integration (Tiered Strategy)

| Trigger | Test Type | Duration | VUs |
|---------|-----------|----------|-----|
| Per-PR | Smoke | 30s | 1 |
| Per-merge to main | Load | 10 min | 50 |
| Nightly | Stress + Soak | ~3 hours | 100-500 |
| Pre-release | Full suite + chaos | ~8 hours | 500+ |

### KPI Targets

| Metric | Target |
|--------|--------|
| P50 latency | < 100ms |
| P95 latency | < 500ms |
| P99 latency | < 1s |
| Error rate | < 0.1% |
| Throughput saturation | Know your ceiling |

> Full load testing report: [.claude/pre-requisites/dotnet-load-testing-performance-report.md](.claude/pre-requisites/dotnet-load-testing-performance-report.md)

---

## Performance Checklist

### Before Launch

- [ ] DbContext pooling enabled (`AddDbContextPool`, pool size 1024)
- [ ] Compiled queries for all hot paths
- [ ] Database indexes cover all frequent WHERE/JOIN/ORDER BY
- [ ] Response compression (Brotli + gzip) enabled
- [ ] Static assets fingerprinted with immutable cache headers
- [ ] Redis configured for distributed caching
- [ ] Health checks for all dependencies (DB, Redis, external APIs)
- [ ] Serilog structured logging with correlation IDs
- [ ] OpenTelemetry metrics + traces configured
- [ ] EF Core slow query interceptor (> 500ms threshold)
- [ ] Connection strings tuned (pool sizes, timeouts, keepalive)

### Before Scale-Out

- [ ] Application is stateless (sessions in Redis, no in-memory state)
- [ ] Data Protection keys stored in shared location (Redis/DB)
- [ ] SignalR configured with Redis backplane
- [ ] Load balancer health checks point to `/healthz/ready`
- [ ] Database read replicas configured and tested
- [ ] PgBouncer for connection pooling (if multiple app instances)
- [ ] Prometheus + Grafana dashboards running
- [ ] Alert rules configured for P95 latency, error rate, CPU, memory
- [ ] Load tests passing with expected throughput
- [ ] Blue-green or canary deployment pipeline ready

### Ongoing Operations

- [ ] Monitor GC pause time (< 5% of wall time)
- [ ] Monitor thread pool queue length (< 50)
- [ ] Monitor cache hit ratio (> 85%)
- [ ] Monitor database replication lag (< 10s)
- [ ] Weekly: review slow query logs
- [ ] Monthly: run soak tests (2-8 hours) for memory leaks
- [ ] Quarterly: re-evaluate architecture against current load
- [ ] Annually: full stack review and upgrade assessment

---

## Detailed Research Reports

All research is stored in the project knowledge base. Here is the complete index:

### Architecture & Scaling
| Report | Description |
|--------|-------------|
| [.claude/pre-requisites/dotnet-efcore-scalability-report.md](.claude/pre-requisites/dotnet-efcore-scalability-report.md) | Full .NET/EF Core scalability report: horizontal/vertical scaling, CQRS, message queues, API gateways, gRPC, resilience patterns |
| [.claude/topics/dotnet-efcore-scalability.md](.claude/topics/dotnet-efcore-scalability.md) | Summary: EF Core scalability findings |
| [.claude/topics/architecture-patterns.md](.claude/topics/architecture-patterns.md) | Monorepo, modular architecture, tRPC |

### Database
| Report | Description |
|--------|-------------|
| [.claude/pre-requisites/efcore-database-scaling-report.md](.claude/pre-requisites/efcore-database-scaling-report.md) | Database scaling: read replicas, sharding, connection pooling, query optimization, caching, migrations, TimescaleDB |
| [.claude/topics/orm-database.md](.claude/topics/orm-database.md) | ORM comparison: Prisma, Drizzle, TypeORM |

### Caching & Performance
| Report | Description |
|--------|-------------|
| [.claude/topics/caching-multilayer.md](.claude/topics/caching-multilayer.md) | Multi-layer cache architecture, HybridCache, strategies |
| [.claude/topics/redis-configuration.md](.claude/topics/redis-configuration.md) | Redis Cluster, Sentinel, eviction, Streams, Pub/Sub |
| [.claude/topics/caching-cdn-assets.md](.claude/topics/caching-cdn-assets.md) | CDN, Nginx, compression, image optimization |
| [.claude/topics/frontend-performance-deep.md](.claude/topics/frontend-performance-deep.md) | Code splitting, Service Workers, Web Workers, virtual scrolling |
| [.claude/topics/api-performance.md](.claude/topics/api-performance.md) | Response compression, ETags, pagination, GraphQL vs REST vs gRPC |
| [.claude/topics/realtime-at-scale.md](.claude/topics/realtime-at-scale.md) | SignalR, WebSocket load balancing, SSE |

### Monitoring & Operations
| Report | Description |
|--------|-------------|
| [.claude/pre-requisites/dotnet-monitoring-observability-report.md](.claude/pre-requisites/dotnet-monitoring-observability-report.md) | Full monitoring stack: OpenTelemetry, Prometheus, Grafana, Jaeger, Serilog, alerting |

### Load Testing
| Report | Description |
|--------|-------------|
| [.claude/pre-requisites/dotnet-load-testing-performance-report.md](.claude/pre-requisites/dotnet-load-testing-performance-report.md) | Load testing tools, benchmarking methodologies, CI/CD integration, chaos engineering |
| [.claude/topics/dotnet-load-testing-performance.md](.claude/topics/dotnet-load-testing-performance.md) | Summary: load testing findings |

### Container Orchestration & Deployment
| Report | Description |
|--------|-------------|
| [.claude/topics/dotnet-container-orchestration.md](.claude/topics/dotnet-container-orchestration.md) | Docker, Kubernetes, k3s, CI/CD pipelines, storage, networking, auto-scaling |

---

## MVP Performance Solution

A working reference implementation is provided in `mvp-performance/`. It demonstrates all the scaling concepts in a runnable Docker Compose environment.

See [mvp-performance/README.md](mvp-performance/README.md) for setup instructions.

### What's Included

| Component | Purpose |
|-----------|---------|
| **ASP.NET Core API** | Sample EF Core app with health checks, OTel, caching |
| **PostgreSQL** | Primary database with sample schema |
| **Redis** | Distributed cache + SignalR backplane |
| **Prometheus** | Metrics collection with alert rules |
| **Grafana** | Pre-configured dashboards (ASP.NET Core, PostgreSQL, Node) |
| **Jaeger** | Distributed tracing UI |
| **k6 load tests** | Ready-to-run performance test scripts |
| **Nginx** | Reverse proxy with compression and caching |
| **Docker Compose** | One-command startup for the entire stack |

---

## License

Private — ITAnalytics Ltd. All rights reserved.
