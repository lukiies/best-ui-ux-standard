# Multi-Layer Caching Architecture - Deep Dive

## Status: RESEARCHED (Feb 2026)

## Architecture Overview

```
Client Browser         CDN / Edge              Application Server         Redis Cluster            Database
  |                      |                          |                        |                      |
  Cache-Control       Cloudflare/Fastly         HybridCache (.NET 9)     Distributed Cache       Query Cache
  Service Worker      Nginx (self-hosted)       IMemoryCache (L1)        Sessions / API           Materialized Views
  IndexedDB           Varnish (mid-tier)        IDistributedCache (L2)   Pub/Sub Invalidation     Connection Pool
  ETag / If-None-Match  Brotli/gzip             Response Caching MW      Streams (durable)
```

## Layer 1: Browser Cache (Cache-Control Headers)

### Header Configuration Strategy

```
# Fingerprinted static assets (immutable - hash in filename)
Cache-Control: public, max-age=31536000, immutable
# Result: Browser never re-validates; cache-bust via filename change

# HTML pages (short-lived, must revalidate)
Cache-Control: public, max-age=0, must-revalidate
ETag: "abc123"
# Result: Browser always checks; 304 if unchanged

# API responses (private, short TTL)
Cache-Control: private, max-age=60, stale-while-revalidate=300
# Result: Fresh for 60s, serve stale for 5min while revalidating

# Sensitive data (never cache)
Cache-Control: no-store, no-cache, must-revalidate, private
```

### Recommended TTL by Content Type

| Content Type | TTL | Strategy |
|-------------|-----|----------|
| Versioned JS/CSS/fonts | 1 year | `immutable` + fingerprint |
| Images (CDN) | 30 days | Content hash URL |
| HTML pages | 0 (revalidate) | ETag + `must-revalidate` |
| API (public) | 60s | `stale-while-revalidate` |
| API (private) | 30-300s | `private` + short TTL |
| User-specific data | no-store | Never cache |

## Layer 2: CDN / Edge (see caching-cdn-assets.md)

## Layer 3: Application-Level (.NET)

### HybridCache (.NET 9+) - Recommended

```csharp
// Program.cs - Registration
builder.Services.AddHybridCache(options =>
{
    options.MaximumPayloadBytes = 1024 * 1024; // 1 MB
    options.MaximumKeyLength = 1024;
    options.DefaultEntryOptions = new HybridCacheEntryOptions
    {
        Expiration = TimeSpan.FromMinutes(5),           // L2 (Redis)
        LocalCacheExpiration = TimeSpan.FromMinutes(1)  // L1 (Memory)
    };
});

// Add Redis as secondary cache
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration
        .GetConnectionString("Redis");
});
```

**Key benefits over IMemoryCache/IDistributedCache:**
- Stampede protection (only 1 caller computes, others wait)
- Unified L1 (memory) + L2 (Redis) API
- Tag-based bulk invalidation
- 18x RPS improvement in benchmarks (1,370 -> 25,798 RPS)

### Usage Pattern

```csharp
public class ProductService(HybridCache cache)
{
    public async Task<ProductDto> GetProductAsync(int id, CancellationToken ct)
    {
        var tags = new List<string> { "products", $"product:{id}" };
        var options = new HybridCacheEntryOptions
        {
            Expiration = TimeSpan.FromMinutes(10),
            LocalCacheExpiration = TimeSpan.FromMinutes(2)
        };

        return await cache.GetOrCreateAsync(
            $"product:{id}",
            async cancel => await _db.Products.FindAsync(id, cancel),
            options, tags, cancellationToken: ct
        );
    }

    // Invalidate by tag
    public async Task InvalidateProductCache(int id)
    {
        await cache.RemoveByTagAsync($"product:{id}");
    }
}
```

## Layer 4: Redis (see redis-configuration.md)

## Layer 5: Response Caching Middleware (ASP.NET Core)

```csharp
// Enable with Brotli priority
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true; // Security: review CRIME/BREACH risk
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
    options.Level = CompressionLevel.Optimal);

// Middleware order matters
app.UseResponseCompression(); // BEFORE UseStaticFiles
app.UseStaticFiles();
app.UseRouting();
```

## Five Core Caching Strategies

| Strategy | Write Path | Read Path | Best For |
|----------|-----------|-----------|----------|
| Cache-Aside | App writes to DB, then cache | Check cache, miss = DB fetch | General purpose |
| Read-Through | Cache fetches from DB on miss | Always read from cache | Transparent caching |
| Write-Through | Sync write to cache + DB | Read from cache | Consistency critical |
| Write-Behind | Async write; cache first, DB later | Read from cache | High write throughput |
| Refresh-Ahead | Pre-load before expiry | Read from cache | Predictable access |
