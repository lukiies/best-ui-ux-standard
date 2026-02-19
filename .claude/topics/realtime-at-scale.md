# Real-Time Features at Scale - Deep Dive

## Status: RESEARCHED (Feb 2026)

## SignalR Scaling with Redis Backplane

### Architecture

```
Client-1 ──WebSocket──→ Server-1 ──Pub/Sub──→ Redis ──Pub/Sub──→ Server-2 ──WebSocket──→ Client-2
Client-3 ──WebSocket──→ Server-1                                  Server-2 ──WebSocket──→ Client-4
```

### Setup (ASP.NET Core)

```csharp
// Program.cs
builder.Services.AddSignalR()
    .AddStackExchangeRedis(connectionString, options =>
    {
        options.Configuration.ChannelPrefix =
            RedisChannel.Literal("MyApp");  // Isolate from other apps
    });

// With Redis Cluster (multiple endpoints)
builder.Services.AddSignalR()
    .AddStackExchangeRedis(options =>
    {
        options.ConnectionFactory = async writer =>
        {
            var config = new ConfigurationOptions
            {
                AbortOnConnectFail = false,
            };
            config.EndPoints.Add("redis-1:6379");
            config.EndPoints.Add("redis-2:6379");
            config.EndPoints.Add("redis-3:6379");
            config.SetDefaultPorts();

            var connection = await ConnectionMultiplexer.ConnectAsync(config, writer);
            connection.ConnectionFailed += (_, e) =>
            {
                Console.WriteLine($"Redis connection failed: {e.Exception}");
            };
            return connection;
        };
    });
```

### Critical: Sticky Sessions Required

When using Redis backplane with non-WebSocket transports (SSE, Long Polling), sticky sessions are **mandatory**.

```nginx
# Nginx sticky session configuration
upstream signalr_backend {
    ip_hash;  # Simple sticky sessions
    server app-1:5000;
    server app-2:5000;
    server app-3:5000;
}

server {
    location /hubs/ {
        proxy_pass http://signalr_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Scaling Tradeoffs

| Factor | Impact |
|--------|--------|
| More Redis Cluster nodes | Higher availability, lower throughput |
| More app servers | Better connection capacity |
| Redis backplane latency | Adds ~1-5ms per message |
| High-frequency messages (>30/sec) | Backplane not recommended; use direct |

## WebSocket Load Balancing

### Layer 7 (Application-Level) - Recommended

```nginx
# Nginx WebSocket proxy with connection upgrade
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

upstream websocket_backend {
    least_conn;  # or ip_hash for sticky
    server backend-1:5000;
    server backend-2:5000;
}

server {
    location /ws {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 86400s;  # Keep alive for 24h
        proxy_send_timeout 86400s;
    }
}
```

### Connection Limits

| Component | Default Limit | Tuned Limit |
|-----------|--------------|-------------|
| Nginx worker_connections | 1,024 | 65,536 |
| Linux file descriptors | 1,024 | 1,000,000 |
| Kestrel max connections | unlimited | Set per use case |
| SignalR hub connections | unlimited | Memory-bound |

## Server-Sent Events (SSE) as Alternative

### When to Choose SSE over WebSocket

| Criterion | WebSocket | SSE |
|-----------|-----------|-----|
| Direction | Bidirectional | Server-to-client only |
| Protocol | ws:// (custom) | HTTP/2 (standard) |
| Reconnection | Manual | Automatic (built-in) |
| Load balancer | Complex (upgrade) | Simple (HTTP) |
| Binary data | Yes | No (text only) |
| Browser support | Universal | Universal |
| Proxy/firewall | Sometimes blocked | Always works |

### SSE Implementation (ASP.NET Core)

```csharp
[HttpGet("events/{userId}")]
public async Task StreamEvents(string userId, CancellationToken ct)
{
    Response.Headers.ContentType = "text/event-stream";
    Response.Headers.CacheControl = "no-cache";
    Response.Headers.Connection = "keep-alive";

    await foreach (var evt in _eventService.GetEventsAsync(userId, ct))
    {
        await Response.WriteAsync($"event: {evt.Type}\n");
        await Response.WriteAsync($"data: {JsonSerializer.Serialize(evt.Data)}\n");
        await Response.WriteAsync($"id: {evt.Id}\n\n");
        await Response.Body.FlushAsync(ct);
    }
}
```

### SSE Client (React)

```typescript
useEffect(() => {
  const eventSource = new EventSource(`/api/events/${userId}`);

  eventSource.addEventListener('notification', (e) => {
    const data = JSON.parse(e.data);
    dispatch(addNotification(data));
  });

  eventSource.addEventListener('dataUpdate', (e) => {
    const data = JSON.parse(e.data);
    queryClient.invalidateQueries(['data', data.id]);
  });

  eventSource.onerror = () => {
    // SSE auto-reconnects; log for monitoring
    console.warn('SSE connection lost, reconnecting...');
  };

  return () => eventSource.close();
}, [userId]);
```

## Azure SignalR Service (Managed Option)

- No sticky sessions required (clients connect directly to Azure)
- Auto-scales to handle any number of connections
- App servers only handle hub logic, not connection management
- Best for cloud-native deployments
- **Pricing:** Per unit (1 unit = 1,000 concurrent connections, 1M messages/day)
