# Design System - Research Findings

## Status: RESEARCHED (Feb 2026)

## Approach: Tailwind v4 Tokens + shadcn/ui + Storybook

### Design System Architecture

```
Design Tokens (CSS custom properties)
    ↓
Tailwind v4 @theme (consumes tokens)
    ↓
shadcn/ui components (uses Tailwind)
    ↓
App-specific components (extends shadcn)
    ↓
Page layouts and templates
```

### Token System

#### Colors (oklch for wide gamut)
```
Primary:     Brand blue — interactive elements, links, buttons
Secondary:   Muted blue — secondary actions, tags
Destructive: Red — delete, error states
Warning:     Amber — caution states
Success:     Green — confirmation states
Muted:       Gray — backgrounds, borders, disabled
Accent:      Highlight — badges, notifications
```

#### Typography Scale
```
xs:    12px / 0.75rem  — captions, labels
sm:    14px / 0.875rem — body small, table cells
base:  16px / 1rem     — body text (DEFAULT)
lg:    18px / 1.125rem — lead text, subtitles
xl:    20px / 1.25rem  — section headings
2xl:   24px / 1.5rem   — page headings
3xl:   30px / 1.875rem — hero headings
```

Font: **Inter** (open source, variable weight, excellent readability)

#### Spacing (4px base unit)
```
0.5: 2px   |  1: 4px   |  2: 8px   |  3: 12px
4:   16px  |  5: 20px  |  6: 24px  |  8: 32px
10:  40px  | 12: 48px  | 16: 64px  | 20: 80px
```

#### Border Radius
```
sm:   4px  — small elements (badges)
md:   6px  — buttons, inputs (DEFAULT)
lg:   8px  — cards, dialogs
xl:   12px — large cards
full: 9999px — pills, avatars
```

### Multi-Brand Theming

Use CSS custom properties with `.theme-*` class:
```css
.theme-brand-a { --color-primary: oklch(0.7 0.15 250); }
.theme-brand-b { --color-primary: oklch(0.6 0.2 150); }
```

### Documentation: Storybook 8

- Component playground and documentation
- Visual regression testing
- Accessibility auditing (a11y addon)
- Design token documentation
- ~85k GitHub stars, industry standard
