# UI/UX Standard — Enterprise Application Platform

The definitive UI/UX technology stack and design standard for building cross-platform enterprise applications. This repository serves as **the single source of truth** for all current and future projects — providing research findings, architecture decisions, code standards, and a working reference implementation (MVP).

**Target projects for conversion:** `eFakt2`, `cvs_ls26` (SoftWork Professional), and all future applications.

---

## Quick Start — Run the MVP

**Web (fastest way to see everything):**
```bash
cd mvp/apps/web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) — you'll see the login page with demo quick-access buttons.

**Mobile (iOS/Android via Expo Go):**
```bash
cd mvp/apps/mobile
npm install
npx expo start
```
Scan the QR code with the Expo Go app on your phone.

**Desktop (Tauri — requires Rust):**
```bash
# Terminal 1: start the web app
cd mvp/apps/web && npm run dev

# Terminal 2: start Tauri wrapper
cd mvp/apps/desktop && npm install && npm run dev
```

> See **"How to Test Each Platform"** below for detailed instructions, prerequisites, and troubleshooting.

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
| Windows Desktop (PWA) | PWA via Edge/Chrome | **MVP Ready** (install from browser) |
| macOS Desktop (PWA) | PWA via Chrome/Edge | **MVP Ready** |
| iOS | Expo (React Native) | **Scaffolded** — login, dashboard, invoices, profile |
| Android | Expo (React Native) | **Scaffolded** — login, dashboard, invoices, profile |
| Windows/macOS/Linux Native | Tauri 2.0 (wraps web app) | **Scaffolded** — system tray, window config, icons |

---

## How to Test Each Platform

### 1. Web (Browser)

The simplest way — just run the Next.js dev server.

```bash
cd mvp/apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in any browser. You'll see the login page with demo quick-access buttons.

### 2. PWA — Windows / macOS Desktop

The web app includes a PWA manifest (`standalone` display mode). When installed, it behaves like a native desktop app with its own window, taskbar icon, and no browser chrome.

**Install as PWA:**
1. Run the web app: `cd mvp/apps/web && npm run dev`
2. Open [http://localhost:3000](http://localhost:3000) in **Chrome** or **Edge**
3. Click the **install icon** (⊕) in the address bar (or the "Install app" prompt)
4. The app installs as a standalone desktop application
5. It appears in your Start Menu (Windows) or Applications folder (macOS)

**For production-quality PWA testing:**
```bash
cd mvp/apps/web
npm run build
npm start
```
Then install from [http://localhost:3000](http://localhost:3000) — this gives you the optimized production build.

**Uninstall:** Open the PWA → click the three-dot menu (top-right) → "Uninstall"

### 3. iOS (Expo / React Native)

**Prerequisites:**
- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli` or use `npx expo`)
- **For iOS Simulator:** macOS with Xcode installed (from Mac App Store)
- **For physical iPhone:** [Expo Go](https://apps.apple.com/app/expo-go/id982107779) app from the App Store

**Run on iOS Simulator (macOS only):**
```bash
cd mvp/apps/mobile
npm install
npx expo start --ios
```
This will open the iOS Simulator and load the app automatically.

**Run on physical iPhone:**
```bash
cd mvp/apps/mobile
npm install
npx expo start
```
1. A QR code will appear in the terminal
2. Open the **Expo Go** app on your iPhone
3. Scan the QR code (or tap the link in the terminal)
4. The app loads on your device over the local network

> **Note:** Your phone and computer must be on the same Wi-Fi network. If you have firewall issues, try `npx expo start --tunnel` (requires `@expo/ngrok` — Expo will prompt to install it).

**Build a standalone iOS app (for TestFlight / App Store):**
```bash
npx eas build --platform ios
```
This requires an [Expo Application Services (EAS)](https://expo.dev/eas) account and an Apple Developer Program membership ($99/year).

### 4. Android (Expo / React Native)

**Prerequisites:**
- Node.js 18+
- **For Android Emulator:** [Android Studio](https://developer.android.com/studio) with an AVD (Android Virtual Device) configured
- **For physical Android phone:** [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) from Google Play

**Run on Android Emulator:**
```bash
cd mvp/apps/mobile
npm install
npx expo start --android
```
This will launch the Android Emulator and install the app.

**Run on physical Android phone:**
```bash
cd mvp/apps/mobile
npm install
npx expo start
```
1. A QR code will appear in the terminal
2. Open the **Expo Go** app on your Android phone
3. Scan the QR code
4. The app loads on your device over the local network

> **Tip:** If using Windows, you may need to allow the Expo dev server through Windows Firewall. The port is typically `8081`.

**Build a standalone Android APK/AAB:**
```bash
# APK for direct installation (testing)
npx eas build --platform android --profile preview

# AAB for Google Play Store
npx eas build --platform android
```

### 5. Native Desktop — Tauri 2.0 (Windows / macOS / Linux)

Tauri wraps the web app in a native window with system tray integration. It uses the OS WebView (Edge WebView2 on Windows, WebKit on macOS) — no bundled Chromium, so the binary is very small (~5-10 MB).

**Prerequisites:**
- The **web app must be running** (`cd mvp/apps/web && npm run dev`)
- **Rust toolchain:** Install from [https://rustup.rs](https://rustup.rs)
  ```bash
  # Windows: download and run rustup-init.exe from https://rustup.rs
  # macOS/Linux:
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
- **Windows additional:** Microsoft Visual Studio C++ Build Tools (the Rust installer will guide you)
- **Linux additional:** `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`

**Run in development mode:**
```bash
# Terminal 1 — start the web app
cd mvp/apps/web
npm run dev

# Terminal 2 — start Tauri (wraps the web app)
cd mvp/apps/desktop
npm install
npm run dev
```
A native window opens showing the web app with system tray icon. The tray has "Show Window" and "Quit" options.

**Build a distributable binary:**
```bash
# Make sure the web app is built first
cd mvp/apps/web && npm run build

# Build the Tauri app
cd mvp/apps/desktop
npm run build
```
The output binary is in `mvp/apps/desktop/src-tauri/target/release/bundle/`:
- **Windows:** `.msi` installer and `.exe` in `nsis/`
- **macOS:** `.dmg` and `.app` in `macos/`
- **Linux:** `.deb`, `.AppImage` in their respective folders

### Platform Testing Checklist

| Test | Web | PWA | iOS | Android | Tauri |
|------|-----|-----|-----|---------|-------|
| Login (demo accounts) | `npm run dev` | Install from Chrome | `npx expo start --ios` | `npx expo start --android` | `npm run dev` (both terminals) |
| Dashboard KPIs | Browser | Installed app | Expo Go / Simulator | Expo Go / Emulator | Native window |
| Invoice master-detail | Browser | Installed app | Tap invoice in list | Tap invoice in list | Native window |
| Role switching | Avatar dropdown | Avatar dropdown | Profile tab → logout | Profile tab → logout | Avatar dropdown |
| Dark mode | Theme toggle | Theme toggle | Follows OS setting | Follows OS setting | Theme toggle |
| Offline capable | Limited (SSR) | Yes (after install) | Via Expo Go | Via Expo Go | Yes (cached) |

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
│   ├── web/                    ← Next.js 16 (App Router) — full MVP
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/       ← Login page
│   │   │   │   ├── (dashboard)/        ← Protected layout with sidebar
│   │   │   │   │   ├── dashboard/      ← Dashboard (KPIs, alerts)
│   │   │   │   │   ├── invoices/       ← Master-detail invoice module
│   │   │   │   │   ├── customers/      ← Customer module (placeholder)
│   │   │   │   │   ├── products/       ← Product module (placeholder)
│   │   │   │   │   ├── warehouse/      ← Warehouse module (placeholder)
│   │   │   │   │   ├── reports/        ← Reports module (placeholder)
│   │   │   │   │   ├── settings/       ← Scoped settings page
│   │   │   │   │   └── users/          ← User & permission management
│   │   │   │   ├── api/v1/             ← RESTful API routes
│   │   │   │   └── manifest.ts         ← PWA manifest (standalone mode)
│   │   │   ├── components/
│   │   │   │   ├── ui/                 ← shadcn/ui components
│   │   │   │   └── layout/            ← App shell (sidebar, header)
│   │   │   ├── stores/                ← Zustand stores
│   │   │   ├── data/                  ← Mock data
│   │   │   └── lib/                   ← Types, utilities
│   │   └── next.config.ts
│   │
│   ├── mobile/                 ← Expo SDK 54 (React Native) — scaffolded
│   │   ├── app/
│   │   │   ├── _layout.tsx            ← Root layout (Paper theme, auth redirect)
│   │   │   ├── (auth)/login.tsx       ← Login with demo quick access
│   │   │   └── (tabs)/               ← Tab navigation
│   │   │       ├── index.tsx          ← Dashboard (KPIs, alerts, recent invoices)
│   │   │       ├── invoices/          ← Invoice list + detail view
│   │   │       └── profile.tsx        ← User profile & logout
│   │   ├── lib/                       ← Auth store, storage, icon mapping
│   │   ├── assets/                    ← App icons, splash screen, fonts
│   │   └── app.json                   ← Expo config (iOS + Android)
│   │
│   └── desktop/                ← Tauri 2.0 (native wrapper) — scaffolded
│       ├── src-tauri/
│       │   ├── src/lib.rs             ← System tray menu (Show/Quit)
│       │   ├── tauri.conf.json        ← Window config (1280×800), CSP, icons
│       │   ├── Cargo.toml             ← Rust dependencies
│       │   ├── capabilities/          ← Tauri security capabilities
│       │   └── icons/                 ← App icons (ico, icns, png)
│       └── package.json               ← Tauri CLI scripts (dev, build)
│
├── packages/
│   └── shared/                 ← Shared code (used by web + mobile)
│       └── src/
│           ├── types.ts               ← TypeScript types (User, Invoice, Module)
│           ├── mock-data.ts           ← Demo data (users, invoices, modules)
│           ├── stores/auth-store.ts   ← Zustand auth store (shared logic)
│           └── index.ts               ← Public exports
│
├── turbo.json                  ← Turborepo config
├── pnpm-workspace.yaml        ← Workspace definition (apps/*, packages/*)
└── package.json                ← Root scripts (dev, dev:web, dev:mobile, dev:desktop)
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
- [x] Phase 2a: MVP Web Application (Next.js + PWA)
- [x] Phase 2b: Shared Packages (types, mock data, auth store)
- [x] Phase 3: Expo Mobile App — scaffolded (login, dashboard, invoices, profile)
- [x] Phase 4: Tauri Desktop Wrapper — scaffolded (system tray, window config, icons)
- [ ] Phase 5: Full Design System (Storybook)
- [ ] Phase 6: eFakt2 Migration
- [ ] Phase 7: cvs_ls26 Migration

> **Phases 3 & 4** are scaffolded with working app shells, navigation, and shared data. They need dependency installation and platform toolchain setup to run (see "How to Test Each Platform" above).

---

## License

Private — ITAnalytics Ltd. All rights reserved.
