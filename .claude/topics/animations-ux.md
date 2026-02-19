# Animations & UX Polish - Research Findings

## Status: RESEARCHED (Feb 2026)

## Winner: Motion (lightweight Framer Motion) + CSS Transitions

### Strategy: Minimal, Professional Animations

Enterprise apps need **subtle, purposeful** animations — not flashy effects.

### Recommended Stack

| Tool | Use Case | Size |
|------|----------|------|
| **CSS transitions** | Hover, focus, color changes | 0 KB |
| **CSS @keyframes** | Loading spinners, skeleton pulse | 0 KB |
| **Motion** | Page transitions, layout animations | ~5 KB |
| **Tailwind animate** | Utility animation classes | 0 KB |

Motion (by the Framer Motion team) is the lightweight alternative — same API, 85% smaller.

### Animation Standards

#### Timing
- **Micro-interactions**: 100-200ms (hover, press, toggle)
- **Enter/exit**: 200-300ms (modal, dropdown, toast)
- **Page transitions**: 200-400ms (route change)
- **Data transitions**: 300-500ms (chart animations)
- **Maximum**: Never exceed 500ms for any UI animation

#### Easing
- **Enter**: `ease-out` (fast start, slow end)
- **Exit**: `ease-in` (slow start, fast end)
- **Move**: `ease-in-out` (smooth both)
- **Spring**: `spring(1, 80, 10)` for natural bounce (rare use)

### Must-Have Animations (All Apps)

| Animation | Implementation | Duration |
|-----------|---------------|----------|
| Page route transition | Motion `AnimatePresence` | 200ms fade |
| Loading skeleton | CSS `@keyframes pulse` | 1.5s loop |
| Button hover/active | CSS `transition` | 150ms |
| Modal enter/exit | Motion `animate` | 200ms scale+fade |
| Toast slide-in | Motion or CSS | 200ms slide |
| Accordion expand | CSS `max-height` transition | 200ms |
| Dropdown menu | Radix built-in | 150ms |
| Tab content switch | CSS fade | 150ms |
| Tooltip appear | CSS transition | 100ms |

### Accessibility: Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Always respect `prefers-reduced-motion`. This is mandatory for WCAG compliance.
