# ORM & Database Strategy - Research Findings

## Status: RESEARCHED (Feb 2026)

## Winner: Drizzle ORM (new projects) + Prisma (existing projects)

### Head-to-Head: Drizzle vs Prisma

| Factor | Drizzle | Prisma |
|--------|---------|--------|
| **Type Safety** | SQL-like, excellent | Schema-first, excellent |
| **Bundle Size** | ~7KB | ~800KB+ (engine) |
| **Performance** | Near-raw SQL | Good (query engine overhead) |
| **Edge Runtime** | Yes (native) | Via Prisma Accelerate |
| **Migrations** | Built-in (drizzle-kit) | Built-in (prisma migrate) |
| **Raw SQL escape** | Easy (sql template) | $queryRaw |
| **Learning Curve** | Medium (SQL knowledge) | Low (intuitive schema) |
| **GitHub Stars** | 28k+ | 40k+ |
| **Maturity** | Medium (2023+) | High (2019+) |
| **Serverless** | Excellent (no engine) | Good (cold start cost) |

### Recommendation

- **New TypeScript projects** → **Drizzle** (faster, lighter, edge-native)
- **Existing Prisma projects** → Keep Prisma (migration not worth it)
- **C#/.NET projects** → Entity Framework Core (existing standard)

### Database Support

| Database | Drizzle | Prisma | Entity Framework |
|----------|---------|--------|------------------|
| PostgreSQL | Yes | Yes | Yes |
| MySQL | Yes | Yes | Yes |
| SQLite | Yes | Yes | Yes |
| SQL Server | Yes | Yes | Yes (primary) |
| MongoDB | No | Yes | Yes |

### Connection Pooling for High Concurrency

| Solution | Use Case |
|----------|----------|
| **PgBouncer** | Self-hosted PostgreSQL pooling |
| **Neon** | Serverless Postgres with built-in pooling |
| **Supabase** | Postgres + auth + realtime, built-in pooling |
| **Prisma Accelerate** | Prisma-specific global connection pool + cache |
| **Drizzle + Neon** | Serverless-native, HTTP-based queries |

### Multi-Database Architecture Pattern

```
Next.js App
    ├── Drizzle ORM (TypeScript)
    │   ├── PostgreSQL (primary data)
    │   ├── SQLite (local/offline cache)
    │   └── SQL Server (legacy integration)
    │
    └── Upstash Redis (caching layer)
        ├── Session store
        ├── API response cache
        └── Rate limiting
```
