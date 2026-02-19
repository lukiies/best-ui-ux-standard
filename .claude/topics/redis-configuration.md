# Redis Configuration for Scale - Deep Dive

## Status: RESEARCHED (Feb 2026)

## Redis Cluster Setup

### Minimum Production Topology (6 nodes)

```
Master-1 (slots 0-5460)     ←→  Replica-1a
Master-2 (slots 5461-10922) ←→  Replica-2a
Master-3 (slots 10923-16383)←→  Replica-3a
```

- **16,384 hash slots** distributed across masters
- Hash algorithm: `HASH_SLOT = CRC16(key) mod 16384`
- Max supported: ~1,000 nodes (linear scaling)
- Full mesh topology: every node connects to every other

### Port Configuration

| Port | Purpose |
|------|---------|
| 6379 (default) | Client connections |
| 16379 (port+10000) | Cluster bus (gossip protocol) |

Both ports must be open in firewall between all cluster nodes.

### redis.conf (Production)

```conf
# Cluster mode
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 15000
cluster-migration-barrier 1

# Memory
maxmemory 4gb
maxmemory-policy allkeys-lfu

# Persistence (choose one)
save 900 1          # RDB: save if 1 key changed in 900s
appendonly yes       # AOF: log every write
appendfsync everysec # Balance: fsync once per second

# Network
tcp-backlog 511
timeout 300
tcp-keepalive 60
```

### Hash Tags (Multi-Key Operations)

```redis
# Force keys to same slot using {tag}
SET {user:1000}.profile "..."
SET {user:1000}.orders "..."
# Both hash to same slot -> multi-key ops work
```

## Redis Sentinel (HA without Cluster)

### Topology (3+ Sentinel nodes, always odd)

```
Sentinel-1 ──→ Master ←── Sentinel-2
    │             │            │
    └─────→ Sentinel-3 ←──────┘
              │
         Replica-1, Replica-2
```

### sentinel.conf

```conf
sentinel monitor mymaster 192.168.1.10 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

- **Quorum = 2**: At least 2 Sentinels must agree master is down
- Failover: Replica promoted automatically; clients redirected

## Memory Management & Eviction

### Eviction Policies Comparison

| Policy | Behavior | Best For |
|--------|----------|----------|
| `allkeys-lru` | Evict least recently used | General caching |
| `allkeys-lfu` | Evict least frequently used | Frequency-based access |
| `volatile-lru` | LRU among keys with TTL | Mixed persistent + cache |
| `volatile-lfu` | LFU among keys with TTL | Mixed with frequency |
| `volatile-ttl` | Evict soonest-expiring | Time-sensitive data |
| `noeviction` | Return error on full | Data must not be lost |

**Recommendation:** `allkeys-lfu` for caching workloads (smarter than LRU).

### Memory Guidelines

- Set `maxmemory` to **70% of available RAM** per node
- Keep **30% free** on each node at all times
- Set TTL on all cache keys (proactive cleanup)
- Monitor: `INFO memory`, `MEMORY USAGE <key>`

## Redis Streams (Real-Time + Durable)

```redis
# Producer: Add event to stream
XADD events * type "order" action "created" orderId "123"

# Consumer group: Process events reliably
XGROUP CREATE events orderProcessors $ MKSTREAM
XREADGROUP GROUP orderProcessors worker1 COUNT 10 BLOCK 2000 STREAMS events >

# Acknowledge processed
XACK events orderProcessors <message-id>

# Auto-claim idle messages (Redis 6.2+)
XAUTOCLAIM events orderProcessors worker2 3600000 0-0 COUNT 10
```

### Streams vs Pub/Sub

| Feature | Pub/Sub | Streams |
|---------|---------|---------|
| Persistence | No (fire-and-forget) | Yes (stored in Redis) |
| Replay | No | Yes |
| Consumer groups | No | Yes |
| Acknowledgment | No | Yes (XACK) |
| Use case | Cache invalidation, notifications | Event sourcing, task queues |

## Pub/Sub for Cache Invalidation

```csharp
// Publisher: When data changes
await redis.PublishAsync("cache:invalidate",
    JsonSerializer.Serialize(new { key = "product:123", tags = new[] { "products" } }));

// Subscriber: Each app instance listens
var sub = redis.GetSubscriber();
await sub.SubscribeAsync("cache:invalidate", (channel, message) =>
{
    var msg = JsonSerializer.Deserialize<InvalidationMessage>(message);
    _memoryCache.Remove(msg.Key);
});
```

**Pattern:** Use Pub/Sub for real-time invalidation signals, Streams for durable event processing.
