# State Management - Research Findings

## Status: RESEARCHED (Feb 2026)

## Winner: Zustand + TanStack Query + React Hook Form

### The Three-Layer Architecture

```
┌─────────────────────────────────────┐
│  Server State — TanStack Query v5   │  API data, caching, sync, pagination
├─────────────────────────────────────┤
│  Client State — Zustand             │  UI state, modals, sidebar, preferences
├─────────────────────────────────────┤
│  Form State — React Hook Form       │  Validation, submission, field state
├─────────────────────────────────────┤
│  URL State — nuqs                   │  Filters, search, pagination in URL
└─────────────────────────────────────┘
```

### Why This Combination

| Library | Size | Purpose | Stars |
|---------|------|---------|-------|
| **TanStack Query v5** | ~12KB | Server state, caching, optimistic updates | 43k+ |
| **Zustand** | ~1KB | Client state (lightweight Redux alternative) | 50k+ |
| **React Hook Form** | ~9KB | Form state, validation (with Zod) | 42k+ |
| **nuqs** | ~2KB | Type-safe URL search params state | 4k+ |

### TanStack Query v5 Features
- Automatic caching with configurable stale time
- Background refetching on window focus
- Optimistic updates for instant UI feedback
- Infinite scroll / pagination support
- Prefetching for anticipated navigation
- Devtools for debugging cache state
- SSR support with Next.js (hydration)

### Zustand Advantages Over Redux
- 50x smaller bundle size
- No boilerplate (no actions, reducers, dispatch)
- Works outside React components
- TypeScript-first
- Middleware: persist, devtools, immer
- Cross-platform (works in React Native)

### Form Pattern with Zod
```typescript
// Shared validation schema (web + mobile)
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// React Hook Form + Zod resolver
const form = useForm({
  resolver: zodResolver(loginSchema),
});
```

### Cross-Platform State Sharing
- Zustand stores: 100% shareable (web ↔ mobile)
- TanStack Query: 100% shareable queries/mutations
- React Hook Form: 100% shareable schemas (via Zod)
- nuqs: web-only (URL state doesn't apply to mobile)
