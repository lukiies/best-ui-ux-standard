# .NET + EF Core Scalability on Dedicated Servers

## Status: RESEARCHED (Feb 2026)
## Keywords: EF Core, .NET 8/9/10, scaling, CQRS, microservices, load-balancing, gRPC, Polly, sharding, read-replica, caching, Redis, TimescaleDB, partitioning, migration

## Summary
Comprehensive research on building fully scalable web applications on dedicated
servers using Entity Framework Core with ASP.NET Core (.NET 8/9/10). Covers
horizontal/vertical scaling, architecture patterns, load balancing, clustering,
connection pooling, CQRS/ES, message queues, API gateways, gRPC, and resilience.

## Key Findings (Architecture & Infrastructure)
- .NET 9 + EF Core 9 deliver 30-70% query perf gains via compiled queries + pooling
- YARP (Microsoft) has overtaken Ocelot as the recommended API gateway/load balancer
- Modular Monolith is the 2025-2026 consensus starting architecture for .NET
- gRPC delivers 5-10x latency improvement over REST for internal services
- Polly v8 with Microsoft.Extensions.Resilience is the standard for fault tolerance
- MassTransit abstracts RabbitMQ/Kafka cleanly for .NET message-based architectures

## Key Findings (Database Scaling — Feb 2026)
- Npgsql 7.0+ has built-in multi-host read/write splitting via Target Session Attributes
- SQL Server Always On uses ApplicationIntent=ReadOnly for replica routing
- DbContext pooling: 2x faster, 10x less memory vs non-pooled (Microsoft benchmarks)
- EF Core 10 (.NET 10 LTS): precompiled queries, 25-50% perf boost, LeftJoin/RightJoin
- Split queries: prevent Cartesian explosion but can be SLOWER in high-throughput (2026 finding)
- EF Core + Dapper hybrid: EF for CRUD, Dapper for complex reports (3-5x faster for aggregates)
- Expand/Contract pattern: gold standard for zero-downtime schema migrations
- TimescaleDB: 90%+ compression, 10-100x faster time-range queries vs plain PostgreSQL
- Redis Sentinel for <25GB caching; Redis Cluster for horizontal data scaling
- FusionCache with Redis backplane: recommended production caching for multi-node .NET apps

## Full Reports
- Architecture & infrastructure: `pre-requisites/dotnet-efcore-scalability-report.md`
- Database scaling deep-dive: `pre-requisites/efcore-database-scaling-report.md`
