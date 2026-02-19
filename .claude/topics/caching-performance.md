# Caching & Performance - Research Findings

## Status: RESEARCHED (Feb 2026)

## Multi-Layer Caching Architecture

```
Browser ──→ CDN/Edge ──→ App Server ──→ Redis ──→ Database
  │              │            │            │          │
  Cache API    Vercel Edge  RSC Cache   Session   Query Cache
  SW Cache     Cloudflare   ISR Cache   API Cache  Materialized
  IndexedDB    Static CDN   Data Cache  Results    Views
```

### Layer Details

| Layer | Technology | TTL | Use Case |
|-------|-----------|-----|----------|
| **Browser** | Service Worker + Cache API | 1-24h | Static assets, offline |
| **CDN** | Vercel Edge / Cloudflare | 1min-1h | Static pages, images |
| **Edge** | Next.js Middleware | Per-request | Auth, redirects, A/B |
| **RSC Cache** | Next.js fetch cache | Configurable | Server component data |
| **ISR** | Next.js revalidation | On-demand | Semi-static pages |
| **Redis** | Upstash (serverless) | 5min-1h | API responses, sessions |
| **ORM** | Prisma Accelerate | 1-5min | Query result cache |
| **DB** | Materialized views | On-demand | Expensive aggregations |

### Redis Strategy: Upstash (Recommended)

Why Upstash over self-hosted Redis:
- **Serverless** — pay per request, no server management
- **Global replication** — multi-region for low latency
- **REST API** — works from Edge/Serverless (no TCP needed)
- **@upstash/redis** — official SDK, works in Next.js Edge Runtime
- **Free tier** — 10k commands/day for development

### Performance Targets (Core Web Vitals)

| Metric | Target | Good | Needs Work | Poor |
|--------|--------|------|------------|------|
| LCP | <2.5s | <2.5s | 2.5-4.0s | >4.0s |
| INP | <200ms | <200ms | 200-500ms | >500ms |
| CLS | <0.1 | <0.1 | 0.1-0.25 | >0.25 |
| FCP | <1.8s | <1.8s | 1.8-3.0s | >3.0s |
| TTFB | <0.8s | <0.8s | 0.8-1.8s | >1.8s |

### Next.js Performance Optimizations

1. **React Server Components** — zero client JS for server-rendered content
2. **Streaming SSR** — progressive page rendering with Suspense
3. **Partial Prerendering** — static shell + streamed dynamic holes
4. **Image optimization** — `next/image` with automatic WebP/AVIF
5. **Font optimization** — `next/font` with zero layout shift
6. **Script optimization** — `next/script` with loading strategies
7. **Route prefetching** — automatic prefetch of visible links
8. **Code splitting** — automatic per-route, dynamic imports
9. **Turbopack** — 5-10x faster HMR than Webpack

## Deep-Dive Topics (Feb 2026)

For detailed configurations, benchmarks, and implementation examples, see:

- [caching-multilayer.md](caching-multilayer.md) — Multi-layer architecture, Cache-Control headers, HybridCache (.NET 9), caching strategies
- [redis-configuration.md](redis-configuration.md) — Redis Cluster (6+ nodes), Sentinel HA, eviction policies, Streams, Pub/Sub invalidation
- [caching-cdn-assets.md](caching-cdn-assets.md) — Self-hosted Nginx CDN, asset fingerprinting, WebP/AVIF, Brotli/gzip compression
- [frontend-performance-deep.md](frontend-performance-deep.md) — Code splitting, Service Workers, Web Workers + Comlink, virtual scrolling, RSC + streaming SSR
- [api-performance.md](api-performance.md) — Response compression, ETags, cursor pagination, GraphQL vs REST vs gRPC-Web
- [realtime-at-scale.md](realtime-at-scale.md) — SignalR + Redis backplane, WebSocket load balancing, SSE alternative
