# MVP Performance Solution

A complete, runnable reference implementation demonstrating enterprise-grade scalability patterns for .NET web applications on dedicated servers.

## What's Inside

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **API** | ASP.NET Core 9 + EF Core 9 | Sample API with DbContext pooling, HybridCache, OTel, health checks |
| **Database** | PostgreSQL 16 | Tuned for performance (shared_buffers, pg_stat_statements) |
| **Cache** | Redis 7 | LFU eviction, AOF persistence, distributed caching |
| **Proxy** | Nginx 1.27 | Reverse proxy with gzip compression, rate limiting, load balancing |
| **Metrics** | Prometheus 2.51 | Scrapes .NET, PostgreSQL, Redis, and Node metrics |
| **Dashboards** | Grafana 10.4 | Pre-built API overview dashboard with latency, RPS, GC, memory panels |
| **Tracing** | Jaeger 1.55 | Distributed tracing via OpenTelemetry |
| **Telemetry** | OTel Collector 0.96 | Collects and routes traces/metrics |
| **Logging** | Seq 2024.1 | Structured log aggregation with search |
| **Alerting** | Alertmanager 0.27 | Alert routing with PagerDuty/OpsGenie templates |
| **Infra Monitoring** | Node Exporter + cAdvisor exporters | Host CPU, memory, disk, network |
| **Load Testing** | k6 0.50 | Smoke, load, and stress test scripts |

## Quick Start

### Prerequisites

- **Docker** 24+ and **Docker Compose** v2
- At least **4 GB RAM** available for Docker
- Ports: 8080 (API), 3000 (Grafana), 9090 (Prometheus), 16686 (Jaeger), 5080 (Seq)

### 1. Start the Stack

```bash
cd mvp-performance
docker compose up -d
```

Wait ~60 seconds for all services to initialize and the API to seed the database.

### 2. Verify Everything is Running

```bash
# Check all services
docker compose ps

# Check API health
curl http://localhost:8080/healthz

# Check API stats
curl http://localhost:8080/api/stats
```

### 3. Open Dashboards

| Dashboard | URL | Credentials |
|-----------|-----|-------------|
| **API** | http://localhost:8080/api/products | — |
| **Health Dashboard** | http://localhost:8080/health-dashboard | — |
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | — |
| **Jaeger** (tracing) | http://localhost:16686 | — |
| **Seq** (logs) | http://localhost:5080 | — |
| **Alertmanager** | http://localhost:9093 | — |

### 4. Run Load Tests

```bash
# Smoke test (30 seconds, 1 VU)
docker compose run --rm k6 run /scripts/smoke-test.js

# Load test (8 minutes, up to 100 VUs)
docker compose --profile loadtest up

# Stress test (15 minutes, up to 500 VUs)
docker compose run --rm k6 run /scripts/stress-test.js
```

While tests run, watch metrics in real-time at:
- **Grafana:** http://localhost:3000 → "MVP Performance — API Overview"
- **Jaeger:** http://localhost:16686 → Service: "mvp-performance-api"
- **Seq:** http://localhost:5080

### 5. Scale the API

```bash
# Scale to 3 API instances (load balanced by Nginx)
docker compose up -d --scale api=3

# Verify all instances are healthy
docker compose ps
curl http://localhost:8080/healthz
```

### 6. Stop Everything

```bash
docker compose down       # Stop containers
docker compose down -v    # Stop and remove all data volumes
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products?page=1&limit=20&category=Electronics` | List products (cached) |
| GET | `/api/products/{id}` | Get product by ID (cached) |
| GET | `/api/orders?page=1&limit=20&status=pending` | List orders with includes |
| GET | `/api/orders/{id}` | Get order with customer and items |
| GET | `/api/customers?page=1&limit=20` | List customers |
| GET | `/api/stats` | Dashboard statistics (cached) |
| GET | `/healthz` | Full health check (DB + Redis) |
| GET | `/healthz/ready` | Readiness probe (critical deps only) |
| GET | `/healthz/live` | Liveness probe (always OK if running) |
| GET | `/health-dashboard` | Health check UI dashboard |
| GET | `/metrics` | Prometheus metrics endpoint |

---

## Architecture Demonstrated

```
Browser/k6 → Nginx (reverse proxy, gzip, rate limit)
                → ASP.NET Core API (×1..N instances)
                    → PostgreSQL (primary, tuned)
                    → Redis (distributed cache)
                    → OTel Collector → Jaeger (traces)
                    → Prometheus (metrics) → Grafana (dashboards)
                    → Serilog → Seq (structured logs)
```

### Scaling Patterns Shown

1. **DbContext Pooling** — pool of 1024 contexts, no allocation per request
2. **HybridCache** — L1 in-memory + L2 Redis, stampede protection
3. **Slow Query Interceptor** — logs queries > 500ms automatically
4. **OpenTelemetry** — full metrics + traces, correlated with logs
5. **Health Checks** — separate ready/live probes for Kubernetes
6. **Response Compression** — gzip at Nginx level
7. **Rate Limiting** — 100 req/s per IP at Nginx
8. **Horizontal Scaling** — `--scale api=N` with Nginx load balancing
9. **Structured Logging** — Serilog with correlation IDs, machine name, thread
10. **Alert Rules** — P95 latency, error rate, GC, thread pool, DB connections, Redis memory

---

## Deploying to Remote Dedicated Servers

### Step 1: Server Preparation

```bash
# On each server (Ubuntu 22.04+ recommended)
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin

# Configure system limits
echo "fs.file-max = 1000000" | sudo tee -a /etc/sysctl.conf
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
echo "vm.overcommit_memory = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Set open file limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

### Step 2: Copy Project to Server

```bash
# From your local machine
rsync -avz --progress ./mvp-performance/ user@your-server:/opt/mvp-performance/
```

### Step 3: Configure for Production

```bash
ssh user@your-server

# Edit environment variables
cd /opt/mvp-performance
cp .env.example .env  # Create from template, update passwords

# Update docker-compose.yml:
# 1. Change all passwords (POSTGRES_PASSWORD, Redis requirepass, etc.)
# 2. Set real domain in Nginx config
# 3. Configure PagerDuty/OpsGenie keys in alertmanager config
# 4. Set Grafana admin password
```

### Step 4: Start Production Stack

```bash
cd /opt/mvp-performance
docker compose up -d

# Verify
docker compose ps
curl http://localhost:8080/healthz
```

### Step 5: Multi-Server Setup (Docker Swarm)

```bash
# On manager node
docker swarm init --advertise-addr <MANAGER_IP>

# On worker nodes (use token from init output)
docker swarm join --token <TOKEN> <MANAGER_IP>:2377

# Deploy as stack
docker stack deploy -c docker-compose.yml mvp

# Scale API across cluster
docker service scale mvp_api=5
```

### Step 6: Kubernetes Setup (k3s for 3-10 servers)

```bash
# On master node
curl -sfL https://get.k3s.io | sh -

# On worker nodes
curl -sfL https://get.k3s.io | K3S_URL=https://<MASTER_IP>:6443 \
  K3S_TOKEN=$(cat /var/lib/rancher/k3s/server/node-token) sh -

# Deploy the app (convert docker-compose to k8s manifests)
# See SCALING-GUIDE.md for Kubernetes manifests and Helm charts
```

---

## Load Test Results Reference

Expected baseline performance (single API instance, Docker Compose):

| Metric | Expected | Notes |
|--------|----------|-------|
| Smoke test (1 VU) | All checks pass, < 100ms avg | Validates functionality |
| Load test (50 VU) | p95 < 500ms, 0% errors | Normal production load |
| Load test (100 VU) | p95 < 1s, < 1% errors | Peak hour simulation |
| Stress test (300 VU) | Some degradation expected | Find the ceiling |
| Stress test (500 VU) | Errors expected | Know your limits |

Actual numbers depend on your hardware. The key insight is: **monitor, measure, then optimize**.

---

## Next Steps

After running this MVP locally, refer to the main [SCALING-GUIDE.md](../SCALING-GUIDE.md) for:

- Moving to read replicas (Phase 2)
- Setting up Redis Cluster (Phase 2-3)
- Extracting microservices (Phase 3)
- Kubernetes deployment with Helm charts (Phase 3)
- Multi-region scaling (Phase 4)

---

## File Structure

```
mvp-performance/
├── docker-compose.yml           ← One-command stack definition
├── README.md                    ← This file
├── src/
│   └── Api/
│       ├── Dockerfile           ← Multi-stage .NET 9 build
│       ├── Api.csproj           ← Dependencies (EF Core, OTel, Redis, etc.)
│       ├── Program.cs           ← App setup (Serilog, OTel, HybridCache, endpoints)
│       ├── Models/
│       │   └── AppDbContext.cs  ← EF Core models with indexes
│       └── Interceptors/
│           └── SlowQueryInterceptor.cs  ← Logs queries > 500ms
├── config/
│   ├── nginx/
│   │   ├── nginx.conf           ← Worker tuning, compression, rate limiting
│   │   └── default.conf         ← Proxy rules, health endpoints
│   ├── prometheus/
│   │   ├── prometheus.yml       ← Scrape targets (API, PG, Redis, Node)
│   │   └── alert.rules.yml     ← Alert rules (latency, errors, GC, infra, DB)
│   ├── alertmanager/
│   │   └── alertmanager.yml     ← Alert routing (PagerDuty/OpsGenie templates)
│   ├── grafana/
│   │   ├── provisioning/
│   │   │   ├── datasources/     ← Auto-configured Prometheus + Jaeger
│   │   │   └── dashboards/      ← Dashboard provisioning config
│   │   └── dashboards/
│   │       └── api-overview.json ← Pre-built API performance dashboard
│   └── otel-collector.yaml      ← OpenTelemetry Collector pipeline config
├── load-tests/
│   ├── smoke-test.js            ← Quick validation (30s, 1 VU)
│   ├── load-test.js             ← Standard load test (8min, up to 100 VUs)
│   └── stress-test.js           ← Breaking point test (15min, up to 500 VUs)
└── scripts/
    └── init-db.sql              ← PostgreSQL initialization (extensions, monitoring user)
```
