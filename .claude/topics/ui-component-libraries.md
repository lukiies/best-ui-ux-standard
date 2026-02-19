# UI Component Libraries - Research Findings

## Status: RESEARCHED (Feb 2026)

## Winner: shadcn/ui + Radix Primitives

### Comparison Matrix

| Library | Approach | Bundle | Customize | A11y | Enterprise Components |
|---------|----------|--------|-----------|------|-----------------------|
| **shadcn/ui** | Copy-paste | Zero* | Full | AA+ | Growing |
| Radix UI | Headless | Small | Full | AA+ | Primitives only |
| MUI v6 | Design system | Large (~80KB) | Medium | AA | Excellent |
| Ant Design v5 | Design system | Large (~100KB) | Medium | Good | Excellent |
| Mantine v7 | Full-featured | Medium (~40KB) | Good | AA | Good |

*shadcn/ui copies code into your project — no runtime dependency.

### Why shadcn/ui

1. **Full ownership** — code lives in your project, not node_modules
2. **Radix primitives** — battle-tested accessibility underneath
3. **Tailwind-native** — perfect integration with our styling strategy
4. **Infinite customization** — modify any component directly
5. **Growing fast** — 80k+ GitHub stars, most-starred UI library
6. **Enterprise components arriving** — data tables, charts, calendars
7. **CLI** — `npx shadcn@latest add button` installs components

### Enterprise Gaps & Solutions

| Need | shadcn/ui Status | Supplement With |
|------|-----------------|-----------------|
| Data Grid (10k+ rows) | Basic table | TanStack Table (free) or AG Grid |
| Charts | shadcn/charts (Recharts) | Recharts or Tremor |
| Date picker | Available | Built-in |
| Rich text editor | Not included | Tiptap or Plate |
| File upload | Not included | react-dropzone + custom |
| Tree view | Not included | Custom w/ Radix |

### Architecture Pattern
```
Radix Primitives (headless, accessible)
    ↓
shadcn/ui (styled with Tailwind, copy-paste)
    ↓
Custom components (extend/compose shadcn)
    ↓
App-specific components (ERP, retail, etc.)
```

### Supplementary Libraries
- **TanStack Table** — headless table with virtualization, sorting, filtering
- **Recharts / Tremor** — charting library compatible with shadcn
- **cmdk** — command palette (⌘K) by shadcn author
- **vaul** — drawer component
- **sonner** — toast notifications
