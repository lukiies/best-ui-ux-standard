# UI/UX Standard — Enterprise Application Platform

The definitive UI/UX technology stack and design standard for building cross-platform enterprise applications. This repository serves as **the single source of truth** for all current and future projects — providing research findings, architecture decisions, code standards, and a working reference implementation (MVP).

**Target projects for conversion:** `eFakt2`, `cvs_ls26` (SoftWork Professional), and all future applications.

---

## Quick Start — Run the MVP

```bash
cd mvp/apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the login page with demo quick-access buttons.

### Demo Accounts

| Role | Email | Access |
|------|-------|--------|
| **Super Admin** | superadmin@company.com | All modules, all permissions, user management |
| **Admin** | admin@company.com | All modules except user management, limited delete |
| **User** | user@company.com | Dashboard, Invoices, Customers, Products, Reports (view/create/edit only) |

You can switch between users in real-time via the avatar dropdown in the header.

---

## The Technology Stack (February 2026)

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| **Framework** | Next.js (App Router) | 16+ | SSR/SSG/ISR, RSC, dominant ecosystem, Vercel-backed |
| **UI Library** | React | 19+ | Largest ecosystem, React Native code sharing |
| **Components** | shadcn/ui + Radix | Latest | Accessible, zero-bundle, fully customizable |
| **Styling** | TailwindCSS | v4 | Zero runtime, design tokens, dominant adoption |
| **State (Server)** | TanStack Query | v5 | Caching, sync, optimistic updates |
| **State (Client)** | Zustand | v5 | 1KB, no boilerplate, cross-platform |
| **Forms** | React Hook Form + Zod | Latest | Validation, type-safe schemas (shared web+mobile) |
| **ORM** | Drizzle (new) / Prisma (existing) | Latest | Type-safe, edge-native, SQL-like |
| **Caching** | Upstash Redis | Serverless | Sub-millisecond, global replication |
| **Mobile** | Expo (React Native) | SDK 52+ | Native iOS/Android, New Architecture |
| **Desktop** | PWA / Tauri 2.0 | Latest | Zero-cost PWA, native when needed |
| **Monorepo** | Turborepo + pnpm | Latest | Fast builds, remote caching |
| **API** | tRPC | v11 | End-to-end type safety, zero codegen |
| **Animations** | Motion + CSS | Latest | Lightweight (~5KB), professional |
| **Icons** | Lucide React | Latest | Consistent, tree-shakeable |
| **Testing** | Vitest + Playwright | Latest | Fast unit + reliable E2E |
| **Language** | TypeScript | 5.x | Type safety everywhere |

### Technology Maturity Statistics (Feb 2026 Snapshot)

| Technology | GitHub Stars | Corporate Backing | NPM Weekly Downloads | Risk |
|-----------|-------------|-------------------|---------------------|------|
| React | 235k+ | Meta | 25M+ | Very Low |
| Next.js | 130k+ | Vercel | 7M+ | Very Low |
| TailwindCSS | 85k+ | Tailwind Labs | 12M+ | Very Low |
| shadcn/ui | 80k+ | Community (Vercel-aligned) | N/A (copy-paste) | Low |
| React Native | 120k+ | Meta | 2.5M+ | Very Low |
| Expo | 35k+ | Expo Inc. | 800k+ | Low |
| Zustand | 50k+ | Community | 5M+ | Low |
| TanStack Query | 43k+ | Community | 4M+ | Low |
| Drizzle | 28k+ | Drizzle Team | 600k+ | Low-Medium |
| Prisma | 40k+ | Prisma Inc. | 3M+ | Very Low |
| Tauri | 85k+ | Tauri Foundation (CrabNebula) | 100k+ | Low |
| Turborepo | 26k+ | Vercel | 1M+ | Low |

> These stats serve as a baseline. Future research iterations should compare against these numbers to detect adoption trends and technology shifts.

---

## Platform Support

| Platform | Technology | Status |
|----------|-----------|--------|
| Web (Browser) | Next.js — full SSR/SSG SPA | **MVP Ready** |
| Windows Desktop | PWA via Edge/Chrome | **MVP Ready** (install from browser) |
| macOS Desktop | PWA via Chrome/Edge | **MVP Ready** |
| iOS | Expo (React Native) | Planned (Phase 2) |
| Android | Expo (React Native) | Planned (Phase 2) |
| Windows Native | Tauri 2.0 (when PWA isn't enough) | Planned (Phase 3) |

### Testing the PWA

1. Run `npm run dev` (or `npm run build && npm start` for production)
2. Open in **Chrome** or **Edge**
3. Click the "Install" icon in the address bar
4. The app installs as a desktop application with its own window

---

## Architecture

### Permission System (3-Tier)

```
Super Admin ─── Full access to everything, manages admins
    │
    ├── Admin ─── Full access to assigned modules, manages users within scope
    │     │
    │     └── User ─── Access to assigned modules (view/create/edit per module)
    │
    └── Each module has granular permissions:
        canView, canCreate, canEdit, canDelete, canExport, canManageUsers
```

Permissions are dynamic — admins can adjust what each user sees/does per module. The sidebar, settings, and features adapt in real-time.

### Layout Architecture

```
┌──────────────────────────────────────────────┐
│ Header (user menu, theme toggle, breadcrumb)  │
├────────┬─────────────────────────────────────┤
│        │                                      │
│ Side-  │    Main Content Area                 │
│ bar    │                                      │
│        │    ┌───────────┬──────────────┐     │
│ Menu   │    │  Master   │   Detail     │     │
│ Sub-   │    │  (List)   │   (Selected) │     │
│ menus  │    │           │              │     │
│        │    │           │  [Maximize]  │     │
│        │    └───────────┴──────────────┘     │
│        │                                      │
└────────┴─────────────────────────────────────┘
```

The detail panel supports **maximize/minimize** — users can zoom into a document for comfortable extended work, then minimize back to the split view.

### Project Structure

```
mvp/
├── apps/
│   └── web/                    ← Next.js 16 (App Router)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/login/       ← Login page
│       │   │   ├── (dashboard)/        ← Protected layout with sidebar
│       │   │   │   ├── dashboard/      ← Dashboard (KPIs, alerts)
│       │   │   │   ├── invoices/       ← Master-detail invoice module
│       │   │   │   ├── customers/      ← Customer module (placeholder)
│       │   │   │   ├── products/       ← Product module (placeholder)
│       │   │   │   ├── warehouse/      ← Warehouse module (placeholder)
│       │   │   │   ├── reports/        ← Reports module (placeholder)
│       │   │   │   ├── settings/       ← Scoped settings page
│       │   │   │   └── users/          ← User & permission management
│       │   │   └── api/v1/             ← RESTful API routes
│       │   ├── components/
│       │   │   ├── ui/                 ← shadcn/ui components
│       │   │   └── layout/            ← App shell (sidebar, header)
│       │   ├── stores/                ← Zustand stores
│       │   ├── data/                  ← Mock data
│       │   └── lib/                   ← Types, utilities
│       └── public/
│           └── manifest.json          ← PWA manifest
│
├── turbo.json                  ← Turborepo config
├── pnpm-workspace.yaml        ← Workspace definition
└── package.json                ← Root scripts
```

---

## RESTful API

The MVP includes API routes with API-key authentication, ready for external integrations.

### Authentication

```bash
# Get API key
curl -X POST http://localhost:3000/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@company.com"}'
```

### Invoices API

```bash
# List invoices (paginated)
curl http://localhost:3000/api/v1/invoices \
  -H "x-api-key: demo-key-superadmin-001"

# Filter by status
curl "http://localhost:3000/api/v1/invoices?status=paid&page=1&limit=10" \
  -H "x-api-key: demo-key-superadmin-001"

# Search
curl "http://localhost:3000/api/v1/invoices?search=ITAnalytics" \
  -H "x-api-key: demo-key-superadmin-001"
```

### Demo API Keys

| Key | Role | Access |
|-----|------|--------|
| `demo-key-superadmin-001` | Super Admin | All endpoints |
| `demo-key-admin-002` | Admin | All endpoints |
| `demo-key-user-003` | User | Invoices only |

---

## Design Standards (Rules for All Projects)

### 1. Typography
- **Font:** Inter (variable weight, excellent readability)
- **Scale:** 12px / 14px / 16px (base) / 18px / 20px / 24px / 30px
- **Body text:** 16px, line-height 1.5

### 2. Spacing
- **Base unit:** 4px
- **Standard gaps:** 8px / 12px / 16px / 24px / 32px
- **Page padding:** 24px (mobile: 16px)

### 3. Colors
- Use semantic color tokens (primary, secondary, destructive, muted)
- Support dark mode (class-based toggle via `next-themes`)
- Use oklch color space for wide gamut (TailwindCSS v4)

### 4. Border Radius
- Small (badges): 4px
- Medium (buttons, inputs): 6px — **default**
- Large (cards): 8px
- XL (modals): 12px

### 5. Animations
- Micro-interactions: 100-200ms
- Enter/exit: 200-300ms
- **Never exceed 500ms**
- Always respect `prefers-reduced-motion`
- Use CSS transitions for simple effects, Motion library for layout animations

### 6. Component Patterns
- Use shadcn/ui as the base — copy-paste, never import from node_modules
- Extend with Radix primitives for custom behavior
- Compose complex components from simple ones
- All components must be accessible (WCAG AA minimum)

### 7. Layout
- Sidebar navigation (collapsible)
- Master-detail for list→document workflows
- Detail panel supports maximize/minimize
- Responsive: sidebar collapses on mobile

### 8. State Management
- Server data → TanStack Query (never local state for API data)
- UI state → Zustand (sidebar, modals, preferences)
- Form state → React Hook Form + Zod
- URL state → search params for filters/pagination

### 9. API Design
- RESTful endpoints under `/api/v1/`
- API-key authentication via `x-api-key` header
- JSON responses with `{ data, pagination?, error? }` structure
- Pagination: `?page=1&limit=20`

---

## Converting an Existing Project

To convert a project (like eFakt2 or cvs_ls26) to this standard:

1. **Read this README** completely — understand the stack and design rules
2. **Clone the MVP** as your starting point or reference
3. **Follow the technology stack** — don't substitute (unless discussed and documented here)
4. **Apply the design standards** — typography, spacing, colors, animations
5. **Use the component library** — shadcn/ui + Radix, extended as needed
6. **Implement the permission system** — superadmin/admin/user with dynamic module access
7. **Include API routes** — RESTful with API-key support from day one
8. **Test across platforms** — Web, PWA (Windows/macOS), then mobile when ready

---

## Knowledge Base (AI-Assisted)

This project uses **cc-mpc-extended-rlm** for AI-assisted knowledge management. Research findings, technology decisions, and patterns are stored in the `.claude/` knowledge base.

### Structure
```
.claude/
├── INDEX.md              ← Topic navigation with keywords
├── topics/               ← 10 research topic files (all RESEARCHED)
├── pre-requisites/       ← Requirements, research plan, stack decision
└── code_examples/        ← Reusable code patterns
```

### Periodic Research Updates

Technology stats (GitHub stars, downloads, community size) should be re-evaluated periodically:
- **Quarterly:** Check for major version releases or ecosystem shifts
- **Annually:** Full stack review with updated comparison tables
- **On event:** If a key technology announces deprecation or major change

The `.claude/pre-requisites/technology-stack-decision.md` document contains the baseline stats for trend comparison.

---

## Roadmap

- [x] Phase 1: Technology Research & Stack Selection
- [x] Phase 2: MVP Implementation (Web + PWA)
- [ ] Phase 3: Expo Mobile App (iOS + Android)
- [ ] Phase 4: Tauri Desktop Wrapper
- [ ] Phase 5: Full Design System (Storybook)
- [ ] Phase 6: eFakt2 Migration
- [ ] Phase 7: cvs_ls26 Migration

---

## License

Private — ITAnalytics Ltd. All rights reserved.
