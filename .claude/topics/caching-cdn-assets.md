# CDN & Static Asset Optimization - Deep Dive

## Status: RESEARCHED (Feb 2026)

## Self-Hosted CDN with Nginx

### Nginx Configuration (High-Performance Static Serving)

```nginx
server {
    listen 443 ssl http2;
    server_name cdn.example.com;

    # Performance: zero-copy file transfer
    sendfile on;
    tcp_nopush on;      # minimize packet fragmentation
    tcp_nodelay on;     # reduce latency on small writes
    keepalive_timeout 65;

    # Brotli compression (requires ngx_brotli module)
    brotli on;
    brotli_static on;   # serve pre-compressed .br files
    brotli_comp_level 6;
    brotli_types text/plain text/css text/javascript
                 application/javascript application/json
                 application/xml image/svg+xml;

    # Gzip fallback
    gzip on;
    gzip_static on;     # serve pre-compressed .gz files
    gzip_vary on;       # Vary: Accept-Encoding header
    gzip_comp_level 6;
    gzip_types text/plain text/css text/javascript
               application/javascript application/json;

    # Fingerprinted assets (immutable)
    location ~* \.(js|css|woff2|woff|ttf|svg)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Vary "Accept-Encoding";
        try_files $uri =404;
    }

    # Images with content negotiation
    location ~* \.(jpg|jpeg|png|gif|webp|avif)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        add_header Vary "Accept";
        try_files $uri =404;
    }

    # HTML (always revalidate)
    location ~* \.html$ {
        add_header Cache-Control "public, max-age=0, must-revalidate";
        add_header ETag "";
        try_files $uri =404;
    }
}
```

## Asset Fingerprinting & Cache Busting

### Build Pipeline Integration

```javascript
// next.config.js - Next.js auto-fingerprints assets
module.exports = {
  output: 'standalone',
  generateBuildId: async () => {
    return process.env.GIT_COMMIT_SHA || 'development';
  },
};
// Output: /_next/static/chunks/app-[hash].js
```

### Filename vs Query String

| Approach | Example | Reliability |
|----------|---------|-------------|
| Filename hash (recommended) | `style.a1b2c3.css` | Works across all caches |
| Query string | `style.css?v=a1b2c3` | Some CDNs ignore query strings |

## Image Optimization

### Format Comparison (Benchmarks)

| Format | Avg Size vs JPEG | Browser Support | Best For |
|--------|-----------------|-----------------|----------|
| JPEG | baseline | Universal | Photos (legacy) |
| WebP | 25-35% smaller | 97%+ browsers | Photos (modern) |
| AVIF | 40-50% smaller | 92%+ browsers | Photos (cutting edge) |
| SVG | N/A (vector) | Universal | Icons, logos |

### Implementation (Next.js)

```jsx
import Image from 'next/image';

// Automatic format negotiation (WebP/AVIF)
<Image
  src="/product.jpg"
  width={800}
  height={600}
  quality={75}
  sizes="(max-width: 768px) 100vw, 50vw"
  placeholder="blur"
  blurDataURL={blurHash}
  alt="Product"
/>
```

### Nginx Content Negotiation

```nginx
# Serve AVIF/WebP if supported
map $http_accept $img_suffix {
    default   "";
    "~*avif"  ".avif";
    "~*webp"  ".webp";
}

location ~* ^(.+)\.(jpg|png)$ {
    try_files $1$img_suffix $uri =404;
    add_header Vary "Accept";
}
```

## Compression Benchmarks

| Algorithm | Compression Ratio | Speed | Browser Support |
|-----------|-------------------|-------|-----------------|
| gzip (level 6) | ~70% reduction | Fast | Universal |
| Brotli (level 6) | ~78% reduction | Moderate | 97%+ |
| Brotli (level 11) | ~82% reduction | Slow (pre-compress) | 97%+ |

**Recommendation:** Pre-compress static assets at Brotli level 9-11 during build. Serve dynamically with Brotli level 4-6. Fall back to gzip for older clients.

### Pre-Compression Build Script

```bash
#!/bin/bash
# Pre-compress static assets during CI/CD
find ./dist -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.json" -o -name "*.svg" \) | while read file; do
    brotli -9 -k "$file"    # Creates .br alongside original
    gzip -9 -k "$file"      # Creates .gz alongside original
done
```
