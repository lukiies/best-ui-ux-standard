# Technology Stack Decision Document

## Date: February 2026
## Status: RESEARCH COMPLETE — Pending POC Validation

---

## The Definitive Stack

### Core Stack Summary

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| **Framework** | Next.js | 15+ | Web application framework (SSR/SSG/ISR) |
| **UI Library** | React | 19+ | Component model |
| **Components** | shadcn/ui + Radix | Latest | Accessible, customizable UI components |
| **Styling** | TailwindCSS | v4 | Utility-first CSS, design tokens |
| **State (Server)** | TanStack Query | v5 | Server state, caching, sync |
| **State (Client)** | Zustand | v5 | Lightweight client state |
| **Forms** | React Hook Form + Zod | Latest | Form validation and handling |
| **ORM** | Drizzle (new) / Prisma (existing) | Latest | Type-safe database access |
| **Caching** | Upstash Redis | Serverless | Application-level caching |
| **Mobile** | Expo (React Native) | SDK 52+ | iOS + Android native |
| **Desktop** | PWA / Tauri 2.0 | Latest | Windows/macOS desktop |
| **Monorepo** | Turborepo + pnpm | Latest | Build orchestration |
| **API** | tRPC | v11 | End-to-end type-safe API |
| **Animations** | Motion + CSS | Latest | Professional micro-animations |
| **Icons** | Lucide React | Latest | Consistent icon system |
| **Charts** | Recharts / Tremor | Latest | Data visualization |
| **Tables** | TanStack Table | v8 | Headless table virtualization |
| **Auth** | NextAuth.js / Clerk | Latest | Authentication |
| **Documentation** | Storybook | v8 | Component documentation |
| **Testing** | Vitest + Playwright | Latest | Unit + E2E testing |
| **Language** | TypeScript | 5.x | Type safety everywhere |

---

## Platform Delivery Matrix

| Platform | Technology | Experience | Bundle |
|----------|-----------|------------|--------|
| Web (Browser) | Next.js 15 App Router | Full SPA/SSR | <200KB gzip |
| Windows Desktop | PWA (Edge/Chrome) | Desktop-class | 0 (web) |
| Windows Desktop+ | Tauri 2.0 (when PWA not enough) | Native | 2-10MB |
| iOS | Expo / React Native | Native | 20-50MB |
| Android | Expo / React Native | Native | 20-50MB |
| macOS | PWA (responsive web) | Web-class | 0 (web) |

---

## Why This Stack — Decision Rationale

### 1. React Ecosystem Lock-In (Intentional)
- React = largest community (200k+ stars), most jobs, most packages
- React Native = code sharing between web and mobile (60-75%)
- Next.js = dominant React framework, Vercel-backed
- All major companies invest in React: Meta, Vercel, Shopify, Netflix

### 2. Performance by Default
- React Server Components = zero client JS for server content
- TailwindCSS v4 = zero runtime CSS
- Turbopack = 5-10x faster development builds
- Upstash Redis = sub-millisecond caching
- Next.js optimizations = image, font, script, route prefetching

### 3. Enterprise-Ready
- shadcn/ui + TanStack Table = data-heavy ERP/reporting apps
- Zod schemas shared between frontend and API = validation consistency
- tRPC = type-safe API with zero code generation
- Drizzle = SQL-like ORM, excellent for complex queries

### 4. Future-Proof
- All chosen technologies are backed by large companies or critical mass
- React, Next.js, Tailwind = multiple years of momentum
- Expo = officially recommended by React Native team
- Turborepo = Vercel-maintained, growing adoption

### 5. Developer Experience
- TypeScript everywhere = type safety, refactoring confidence
- Hot Module Replacement = instant feedback
- Storybook = component development in isolation
- pnpm = fastest package manager, strict deps

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Vercel pricing for hosting | Medium | Low | Self-host Next.js (supports Node.js) |
| shadcn/ui missing enterprise component | Medium | Low | Supplement with TanStack, AG Grid |
| React Native perf for complex mobile UI | Low | Medium | Escape hatch to native modules |
| Tauri mobile immaturity | Medium | Low | Use Expo for mobile, Tauri desktop only |
| Drizzle breaking changes (newer lib) | Low | Medium | Pin versions, migration tests |

---

## What's NOT In The Stack (And Why)

| Technology | Why Excluded |
|-----------|-------------|
| Vue / Nuxt | No React Native code sharing, smaller ecosystem |
| Svelte / SvelteKit | Too young for enterprise bet, small ecosystem |
| Angular | Declining adoption, heavy, no RN sharing |
| MUI / Ant Design | Large bundle, limited customization |
| Electron | 150-300MB bundles, high memory usage |
| Redux | Unnecessary complexity for most apps (Zustand replaces) |
| GraphQL | Overkill for most apps (tRPC simpler with same type safety) |
| styled-components | Runtime CSS, not RSC compatible |
| MongoDB | Not needed (relational data dominates ERP/reporting) |

---

## Next Steps

1. **POC Development** — Build proof-of-concept with this stack
2. **Benchmark** — Measure Core Web Vitals, bundle size, build times
3. **Design System** — Finalize tokens, component library in Storybook
4. **eFakt2 Migration** — Plan incremental migration of existing app
5. **Templates** — Create starter templates for new projects
