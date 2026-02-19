# Frontend Performance - Deep Dive

## Status: RESEARCHED (Feb 2026)

## Code Splitting & Lazy Loading

### Route-Based Splitting (Next.js - Automatic)

```tsx
// app/dashboard/page.tsx - Auto code-split per route
// Each route segment = separate JS chunk

// Dynamic import for heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,  // Client-only component
});
```

### Bundle Impact (Benchmarks)

| Scenario | Initial Bundle | Strategy |
|----------|---------------|----------|
| No splitting | ~2MB | Monolith |
| Route splitting | ~300KB initial | Auto (Next.js) |
| Component splitting | ~150KB initial | Dynamic imports |
| With tree-shaking | ~100KB initial | ESM + dead code elimination |

## Service Workers (Offline + Performance)

### Workbox Configuration (Next.js PWA)

```javascript
// next.config.js with next-pwa
const withPWA = require('next-pwa')({
  dest: 'public',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.example\.com\/.*$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 2592000 },
      },
    },
  ],
});
```

### Caching Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| CacheFirst | Cache -> Network (fallback) | Static assets, images |
| NetworkFirst | Network -> Cache (fallback) | API data, HTML |
| StaleWhileRevalidate | Cache (serve) + Network (update) | Frequently updated content |
| NetworkOnly | Network always | Real-time data |
| CacheOnly | Cache always | Offline-only content |

## Web Workers (Heavy Computation)

### With Comlink (Recommended)

```typescript
// worker.ts
import { expose } from 'comlink';

const api = {
  processLargeDataset(data: number[]): number[] {
    // Heavy computation off main thread
    return data.map(x => Math.sqrt(x) * Math.log(x));
  },
  async generateReport(params: ReportParams): Promise<Report> {
    // Complex aggregation without blocking UI
    return computeReport(params);
  },
};

expose(api);
```

```typescript
// component.tsx
import { wrap } from 'comlink';

const worker = new Worker(new URL('./worker.ts', import.meta.url));
const api = wrap<typeof import('./worker').api>(worker);

// Call as if local function
const result = await api.processLargeDataset(largeArray);
```

**INP Impact:** Offloading >50ms tasks to Web Workers measurably improves Interaction to Next Paint (INP) scores.

## Virtual Scrolling (Large Datasets)

### TanStack Virtual (Recommended for React)

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,  // Can be 100,000+ items
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,  // px per row
    overscan: 5,             // render 5 extra rows
  });

  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ItemRow item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Performance:** Renders only ~15-25 visible rows regardless of total data size (10K, 100K, or 1M rows).

## React Server Components + Streaming SSR

### Architecture

```
Request → Server Component (no JS shipped)
           ├── Static parts (instant render)
           └── <Suspense fallback={<Skeleton />}>
                 └── Async Server Component (streamed when ready)
```

### Performance Impact

| Metric | Traditional SSR | Streaming SSR + RSC |
|--------|----------------|---------------------|
| TTFB | Wait for all data | Immediate (shell) |
| FCP | Wait for all data | Immediate (static parts) |
| JS Bundle | Full app | Only client components |
| TTI | After hydration | Progressive (per component) |

### Partial Prerendering (Next.js 15+)

```tsx
// Static shell + dynamic holes
export default function ProductPage({ params }) {
  return (
    <div>
      <StaticHeader />           {/* Pre-rendered at build */}
      <Suspense fallback={<PriceSkeleton />}>
        <DynamicPrice id={params.id} />  {/* Streamed at request */}
      </Suspense>
      <StaticFooter />           {/* Pre-rendered at build */}
    </div>
  );
}
```
