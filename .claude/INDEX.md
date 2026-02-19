# Knowledge Base Index - UI/UX Research & Standardization

## Research Status: Phase 1+2 Complete (Feb 2026)

All topic files contain research findings. MVP implemented and building successfully.

## Document Navigation

| Document | Status | Keywords |
|----------|--------|----------|
| [topics/frontend-frameworks.md](topics/frontend-frameworks.md) | RESEARCHED | next.js, react, vue, svelte, SSR, SSG, ISR, RSC |
| [topics/ui-component-libraries.md](topics/ui-component-libraries.md) | RESEARCHED | shadcn, radix, MUI, ant-design, components, headless |
| [topics/styling-strategy.md](topics/styling-strategy.md) | RESEARCHED | tailwind, CSS-in-JS, CSS modules, styling, theme, tokens |
| [topics/state-management.md](topics/state-management.md) | RESEARCHED | zustand, tanstack-query, react-hook-form, zod, state |
| [topics/cross-platform.md](topics/cross-platform.md) | RESEARCHED | react-native, expo, tauri, PWA, desktop, mobile |
| [topics/caching-performance.md](topics/caching-performance.md) | RESEARCHED | redis, upstash, CDN, edge, cache, web-vitals, performance |
| [topics/orm-database.md](topics/orm-database.md) | RESEARCHED | prisma, drizzle, typeorm, ORM, database, postgresql |
| [topics/design-system.md](topics/design-system.md) | RESEARCHED | figma, design-tokens, storybook, theme, typography, color |
| [topics/animations-ux.md](topics/animations-ux.md) | RESEARCHED | motion, framer-motion, animation, transition, accessibility |
| [topics/architecture-patterns.md](topics/architecture-patterns.md) | RESEARCHED | monorepo, turborepo, tRPC, pnpm, modular, architecture |
| [pre-requisites/research-plan.md](pre-requisites/research-plan.md) | COMPLETE | plan, phases, objectives, methodology, POC |
| [pre-requisites/requirements.md](pre-requisites/requirements.md) | COMPLETE | requirements, constraints, cross-platform, ERP, retail |
| [pre-requisites/technology-stack-decision.md](pre-requisites/technology-stack-decision.md) | COMPLETE | stack, decision, rationale, final, summary |
| [topics/mvp-implementation.md](topics/mvp-implementation.md) | IMPLEMENTED | MVP, build, gotchas, patterns, permissions, api-key |
| [topics/dotnet-container-orchestration.md](topics/dotnet-container-orchestration.md) | RESEARCHED | docker, kubernetes, k3s, k8s, container, orchestration, deployment, scaling, CI/CD, ingress, storage, bare-metal, dedicated-server, .NET |
| [topics/caching-multilayer.md](topics/caching-multilayer.md) | RESEARCHED | multi-layer, cache-control, HybridCache, .NET9, IMemoryCache, IDistributedCache, stampede, cache-aside, write-through, write-behind |
| [topics/redis-configuration.md](topics/redis-configuration.md) | RESEARCHED | redis-cluster, sentinel, hash-slots, eviction, LFU, LRU, streams, pub/sub, cache-invalidation, maxmemory |
| [topics/caching-cdn-assets.md](topics/caching-cdn-assets.md) | RESEARCHED | CDN, nginx, brotli, gzip, compression, WebP, AVIF, fingerprinting, cache-busting, immutable, static-assets |
| [topics/frontend-performance-deep.md](topics/frontend-performance-deep.md) | RESEARCHED | code-splitting, lazy-loading, service-worker, web-worker, comlink, virtual-scrolling, RSC, streaming-SSR, partial-prerendering |
| [topics/api-performance.md](topics/api-performance.md) | RESEARCHED | response-compression, ETags, cursor-pagination, GraphQL, REST, gRPC-Web, Envoy, persisted-queries, protobuf |
| [topics/realtime-at-scale.md](topics/realtime-at-scale.md) | RESEARCHED | SignalR, redis-backplane, WebSocket, SSE, sticky-sessions, load-balancing, Azure-SignalR, connection-limits |
| [topics/dotnet-efcore-scalability.md](topics/dotnet-efcore-scalability.md) | RESEARCHED | EF Core, .NET 8/9/10, scaling, CQRS, microservices, load-balancing, gRPC, Polly, YARP, RabbitMQ, Kafka, sharding, read-replica, Redis, TimescaleDB |
| [pre-requisites/dotnet-efcore-scalability-report.md](pre-requisites/dotnet-efcore-scalability-report.md) | COMPLETE | Full scalability report, dedicated servers, architecture diagrams, NuGet packages |
| [pre-requisites/efcore-database-scaling-report.md](pre-requisites/efcore-database-scaling-report.md) | COMPLETE | EF Core database scaling, read-replica, write-read splitting, sharding, multi-tenant, connection-pool, PgBouncer, compiled-queries, split-queries, Redis-cache, second-level-cache, zero-downtime-migration, expand-contract, TimescaleDB, partitioning, archiving |
| [topics/dotnet-load-testing-performance.md](topics/dotnet-load-testing-performance.md) | RESEARCHED | load-testing, stress-testing, k6, NBomber, JMeter, Locust, Artillery, BenchmarkDotNet, performance, profiling, chaos-engineering, CI/CD |
| [pre-requisites/dotnet-load-testing-performance-report.md](pre-requisites/dotnet-load-testing-performance-report.md) | COMPLETE | Full load testing report, k6 scripts, NBomber examples, diagnostic tools, KPIs, CI/CD integration |
| [pre-requisites/dotnet-monitoring-observability-report.md](pre-requisites/dotnet-monitoring-observability-report.md) | COMPLETE | OpenTelemetry, Prometheus, Grafana, Jaeger, Serilog, alerting, health-checks, RUM, infrastructure-monitoring, slow-query-interceptor, correlation-id, PagerDuty, OpsGenie |

## Quick Reference: The Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15+ (React 19) |
| Components | shadcn/ui + Radix |
| Styling | TailwindCSS v4 |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| ORM | Drizzle (new) / Prisma (existing) |
| Cache | Upstash Redis |
| Mobile | Expo (React Native) |
| Desktop | PWA / Tauri 2.0 |
| Monorepo | Turborepo + pnpm |
| API | tRPC |
| Testing | Vitest + Playwright |
