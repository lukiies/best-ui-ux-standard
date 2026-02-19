# MVP Implementation - Findings & Lessons

## Status: IMPLEMENTED (Feb 2026)

## Stack Versions (Actual from MVP)

| Package | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | Turbopack default, React 19 |
| React | 19.2.3 | Server Components, use() hook |
| TailwindCSS | v4 | CSS-first config, @theme |
| shadcn/ui | 3.8.5 | 23 components installed |
| Zustand | Latest | Auth store with persist |
| Lucide React | Latest | Icon library |
| sonner | Latest | Toast notifications |
| next-themes | Latest | Dark mode support |

## Build Performance

- **Compile time:** 1.7 seconds (Turbopack)
- **Static pages:** 16 routes generated in 436ms
- **Zero TypeScript errors** on first build
- **API routes:** 3 dynamic routes (auth, invoices, users)

## Key Patterns Validated

### 1. Permission-Aware Navigation
- Sidebar menu filters items based on user permissions
- Settings page only shows modules user has access to
- API routes validate permissions via API keys

### 2. Master-Detail Layout
- Split view: list (50%) + detail (50%)
- Maximize button expands detail to full width
- Close button returns to list-only view
- Smooth transitions between states

### 3. Role-Based Access
- SuperAdmin: sees everything, manages all users
- Admin: sees most modules, no user management
- User: limited modules, no delete/settings access
- Real-time role switching in header dropdown (demo)

### 4. API-Key Authentication
- `x-api-key` header or `Authorization: Bearer` token
- Different keys per role with different access levels
- Paginated responses with `{ data, pagination }` structure

## Gotchas Discovered

1. **shadcn/ui sidebar** requires `SidebarProvider` wrapper
2. **next-themes** needs `suppressHydrationWarning` on `<html>`
3. **Zustand persist** requires `useState(false)` mount guard to avoid hydration mismatch
4. **create-next-app** interactive prompts need `--yes` flag for CI
5. **PWA manifest** must be in `public/` directory with correct `start_url`
