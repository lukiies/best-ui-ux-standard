# Styling Strategy - Research Findings

## Status: RESEARCHED (Feb 2026)

## Winner: TailwindCSS v4

### Comparison

| Approach | Runtime | RSC | Tokens | DX | Adoption |
|----------|---------|-----|--------|-----|----------|
| **TailwindCSS v4** | Zero | Yes | Config-based | Excellent | Dominant |
| Panda CSS | Zero | Yes | Type-safe | Good | Growing |
| vanilla-extract | Zero | Yes | Type-safe | Good | Niche |
| CSS Modules | Zero | Yes | Manual | Good | Standard |
| styled-components | Runtime | No | ThemeProvider | Great | Declining |

### Why TailwindCSS v4

1. **Zero runtime** — pure CSS output, no JS overhead
2. **RSC compatible** — works perfectly with React Server Components
3. **Dominant adoption** — used by shadcn/ui, Vercel, and most modern stacks
4. **v4 improvements** — CSS-first config, Lightning CSS engine, faster builds
5. **Design token integration** — CSS custom properties for theming
6. **Responsive utilities** — mobile-first responsive design built-in
7. **Dark mode** — native support with `dark:` variant
8. **IDE support** — excellent IntelliSense in VS Code

### TailwindCSS v4 Key Changes
- **CSS-first configuration** — `@theme` directive in CSS replaces JS config
- **Lightning CSS** — 100x faster than PostCSS for processing
- **Native cascade layers** — `@layer` support
- **Container queries** — `@container` support built-in
- **Wide gamut colors** — oklch/oklab color spaces
- **3D transforms** — new utility classes
- **No more purge config** — automatic content detection

### Design Token Strategy with Tailwind v4
```css
@theme {
  --color-primary: oklch(0.7 0.15 250);
  --color-secondary: oklch(0.6 0.1 200);
  --font-sans: 'Inter', system-ui, sans-serif;
  --spacing-unit: 0.25rem;
  --radius-default: 0.5rem;
}
```

### Dark Mode Implementation
- Use `class` strategy (not `media`) for user control
- CSS custom properties switch on `.dark` class
- `next-themes` library for SSR-safe theme switching
- Persist preference in localStorage + respect system preference
