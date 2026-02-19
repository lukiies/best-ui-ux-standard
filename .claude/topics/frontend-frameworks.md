# Frontend Frameworks - Research Findings

## Status: RESEARCHED (Feb 2026)

## Winner: Next.js 15+ (React 19)

### Why Next.js

| Factor | Next.js | Nuxt (Vue) | SvelteKit | Remix |
|--------|---------|------------|-----------|-------|
| GitHub Stars | 130k+ | 55k+ | 20k+ | 30k+ |
| Corporate Backing | Vercel | Community | Vercel | Shopify |
| SSR/SSG/ISR | All three | All three | SSR/SSG | SSR only |
| React Server Components | Yes (native) | N/A | N/A | Yes |
| Code sharing w/ RN | Excellent | None | None | Limited |
| Enterprise adoption | Very High | High | Growing | Medium |
| Ecosystem size | Massive | Large | Growing | Medium |

### Next.js 15 Key Features (App Router)
- **React Server Components (RSC)** — server-rendered by default, zero client JS
- **Server Actions** — form handling and mutations without API routes
- **Partial Prerendering (PPR)** — static shell + streamed dynamic content
- **Turbopack** — Rust-based bundler replacing Webpack (5-10x faster HMR)
- **Image/Font/Script optimization** — built-in performance features
- **Middleware** — edge-first request handling
- **ISR (Incremental Static Regeneration)** — revalidate on-demand or timed

### React 19 Key Features
- **Server Components** — native server rendering primitives
- **use()** hook — read promises and context in render
- **Actions** — async transitions for forms/mutations
- **useOptimistic** — optimistic UI updates
- **useFormStatus** — form submission state
- **Document Metadata** — native `<title>`, `<meta>` in components
- **Improved hydration** — better error recovery, selective hydration

### Decision Rationale
1. **React ecosystem dominance** — largest component library ecosystem
2. **React Native code sharing** — same mental model, shared types/logic
3. **Vercel backing** — continuous investment, not going anywhere
4. **Community** — largest pool of developers, tutorials, packages
5. **Enterprise proven** — Netflix, TikTok, Twitch, Notion, Hulu use Next.js
