# API Performance Optimization - Deep Dive

## Status: RESEARCHED (Feb 2026)

## Response Compression (ASP.NET Core)

```csharp
// Program.cs
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(
        new[] { "application/json", "text/json" });
});

builder.Services.Configure<BrotliCompressionProviderOptions>(o =>
    o.Level = CompressionLevel.Optimal); // Balance speed vs ratio

// Middleware order: BEFORE UseStaticFiles and UseRouting
app.UseResponseCompression();
app.UseStaticFiles();
```

### Compression Benchmarks (100KB JSON payload)

| Method | Compressed Size | Reduction | Notes |
|--------|----------------|-----------|-------|
| None | 100 KB | 0% | Baseline |
| Gzip | ~35 KB | 65% | Universal support |
| Brotli | ~30 KB | 70% | Modern browsers (97%+) |

**Note:** Prefer server-level compression (Nginx/IIS) over middleware for better performance. Middleware is fallback for Kestrel-only deployments.

## ETags and Conditional Requests

```csharp
// ETag middleware for API responses
app.Use(async (context, next) =>
{
    var response = context.Response;
    var originalBody = response.Body;

    using var memStream = new MemoryStream();
    response.Body = memStream;
    await next();

    memStream.Seek(0, SeekOrigin.Begin);
    var body = await new StreamReader(memStream).ReadToEndAsync();

    // Generate ETag from content hash
    var etag = $"\"{Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(body)))[..16]}\"";
    response.Headers.ETag = etag;

    // Check If-None-Match
    if (context.Request.Headers.IfNoneMatch == etag)
    {
        response.StatusCode = 304;
        response.ContentLength = 0;
        return;
    }

    memStream.Seek(0, SeekOrigin.Begin);
    await memStream.CopyToAsync(originalBody);
});
```

**Impact:** 304 responses save bandwidth and reduce parse time. 92% of production APIs use ETags for concurrency control (2025 survey data).

## Pagination Strategies

### Cursor-Based (Recommended for 10,000+ records)

```csharp
// API endpoint
[HttpGet("products")]
public async Task<CursorPagedResult<ProductDto>> GetProducts(
    [FromQuery] string? cursor,
    [FromQuery] int limit = 50)
{
    var query = _db.Products.OrderBy(p => p.Id);

    if (!string.IsNullOrEmpty(cursor))
    {
        var lastId = DecodeCursor(cursor);
        query = query.Where(p => p.Id > lastId);
    }

    var items = await query.Take(limit + 1).ToListAsync();
    var hasNext = items.Count > limit;
    if (hasNext) items.RemoveAt(items.Count - 1);

    return new CursorPagedResult<ProductDto>
    {
        Items = items.Select(MapToDto),
        NextCursor = hasNext ? EncodeCursor(items.Last().Id) : null,
        HasMore = hasNext,
    };
}
```

### Comparison

| Strategy | Performance | Consistency | Complexity |
|----------|------------|-------------|------------|
| Offset | O(n) skip cost | Breaks on insert/delete | Simple |
| Cursor | O(1) seek | Stable across mutations | Moderate |
| Keyset | O(1) seek | Stable | Moderate |

## GraphQL vs REST vs gRPC (2026 Guidance)

### Decision Matrix

| Criterion | REST | GraphQL | gRPC-Web |
|-----------|------|---------|----------|
| Over-fetching | Common | Solved | N/A (typed) |
| Under-fetching | N+1 calls | Single query | N/A (typed) |
| CDN caching | Easy (URL-based) | Hard (POST body) | Not possible |
| Real-time | SSE/WebSocket | Subscriptions | Streaming |
| File uploads | Native | Complex | Native |
| Browser support | Universal | Universal | Requires proxy (Envoy) |
| Schema/typing | OpenAPI (optional) | Built-in | Protobuf (strict) |
| Tooling maturity | Excellent | Good | Good |

### Recommended Hybrid Architecture (2026)

```
External clients ──→ REST (public API, webhooks)
                       │
Browser/Mobile ──→ GraphQL Gateway ──→ gRPC ──→ Microservices
                       │                          │
                  Persisted Queries           Protobuf serialization
                  CDN via query hash          10x faster than JSON
```

### GraphQL Caching Strategy

```typescript
// Persisted queries enable CDN caching
// Client sends hash instead of full query
GET /graphql?extensions={"persistedQuery":{"sha256Hash":"abc123"}}

// CDN keys on: hash + variables
Cache-Control: public, max-age=60
```

## gRPC-Web Setup

```
Browser ──HTTP/1.1──→ Envoy Proxy ──HTTP/2──→ gRPC Backend
                     (translates)
```

```yaml
# envoy.yaml
listeners:
  - address: { socket_address: { address: 0.0.0.0, port_value: 8080 } }
    filter_chains:
      - filters:
          - name: envoy.filters.network.http_connection_manager
            typed_config:
              http_filters:
                - name: envoy.filters.http.grpc_web
```

**Benchmark:** gRPC with Protobuf is ~10x faster serialization and ~60-80% smaller payloads than JSON REST for complex objects.
