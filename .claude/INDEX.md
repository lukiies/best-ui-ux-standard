# Knowledge Base Index - UI/UX Research & Standardization

## Research Status: Phase 1 Complete (Feb 2026)

All topic files contain research findings. Next: POC validation.

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
