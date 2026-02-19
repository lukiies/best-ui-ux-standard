# Architecture Patterns - Research Findings

## Status: RESEARCHED (Feb 2026)

## Winner: Turborepo + pnpm Workspaces

### Monorepo Structure (Final)

```
root/
├── apps/
│   ├── web/              → Next.js 15 (App Router, SSR/SSG)
│   ├── mobile/           → Expo / React Native (iOS + Android)
│   ├── desktop/          → Tauri wrapper (when PWA isn't enough)
│   └── docs/             → Storybook documentation site
│
├── packages/
│   ├── ui/               → Shared component library (shadcn/ui based)
│   ├── config/           → Shared ESLint, TypeScript, Tailwind configs
│   ├── utils/            → Shared utility functions
│   ├── types/            → Shared TypeScript types/interfaces
│   ├── api-client/       → Type-safe API client (tRPC or generated)
│   ├── validators/       → Shared Zod schemas
│   └── design-tokens/    → CSS custom properties, token definitions
│
├── turbo.json            → Turborepo pipeline configuration
├── pnpm-workspace.yaml   → Workspace package definitions
├── package.json          → Root scripts, devDependencies
└── tsconfig.base.json    → Shared TypeScript base config
```

### Why Turborepo + pnpm

| Factor | Turborepo | Nx |
|--------|-----------|-----|
| Config | Low (turbo.json) | Higher (nx.json + project.json) |
| Caching | Local + remote (Vercel) | Local + remote (Nx Cloud) |
| Sweet spot | <20 packages | 20+ packages |
| Vercel integration | Native | Requires setup |
| Learning curve | Low | Medium |
| Stars | 26k+ | 23k+ |

**Our project: ~8-10 packages = Turborepo sweet spot.**

### API Layer: tRPC (Recommended)

| Option | Type Safety | Code Sharing | Setup |
|--------|------------|-------------|-------|
| **tRPC** | End-to-end (zero codegen) | Excellent | Easy |
| REST + OpenAPI | Via codegen | Good | Medium |
| GraphQL | Via codegen | Good | Complex |

tRPC advantages:
- No code generation step
- Shared types between server and client automatically
- Works with Next.js App Router
- React Query integration built-in
- ~35k GitHub stars

### Module Architecture for App Suite

```
Shared Platform Layer (packages/*)
    ├── Auth module (login, SSO, permissions)
    ├── Layout module (sidebar, header, navigation)
    ├── Data Grid module (tables, filters, export)
    ├── Dashboard module (charts, widgets, KPIs)
    └── Notification module (toasts, alerts, inbox)

App Layer (apps/*)
    ├── ERP App (uses all shared modules)
    ├── Reporting App (dashboard + data grid)
    ├── Retail App (data grid + custom POS)
    └── Company Website (layout + custom pages)
```

All apps share the same design language, auth, and navigation — users feel they're in one system.
