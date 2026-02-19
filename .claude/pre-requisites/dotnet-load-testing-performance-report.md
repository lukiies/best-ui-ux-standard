# Load Testing, Stress Testing & Performance Benchmarking for Large-Scale .NET Web Applications

## Date: February 2026
## Status: RESEARCH COMPLETE
## Keywords: load-testing, stress-testing, performance, k6, NBomber, JMeter, Locust, Artillery, BenchmarkDotNet, chaos-engineering, CI/CD, database, profiling

---

## Table of Contents

1. [Load Testing Tools Comparison](#1-load-testing-tools-comparison)
2. [Benchmark Methodologies](#2-benchmark-methodologies)
3. [Performance Profiling for .NET](#3-performance-profiling-for-net)
4. [Key Performance Indicators](#4-key-performance-indicators)
5. [Continuous Performance Testing in CI/CD](#5-continuous-performance-testing-in-cicd)
6. [Database Performance Testing](#6-database-performance-testing)
7. [Chaos Engineering for .NET](#7-chaos-engineering-for-net)
8. [Complete Code Examples](#8-complete-code-examples)
9. [Recommended Strategy](#9-recommended-strategy)

---

## 1. Load Testing Tools Comparison

### 1.1 Grafana k6 (Recommended for API Testing)

**Version:** v0.54+ (2025-2026)
**Language:** JavaScript (ES6) test scripts, Go runtime
**License:** AGPL-3.0 (OSS), Grafana Cloud k6 (commercial)

**Strengths:**
- Extremely low resource consumption: Go-based engine generates thousands of VUs on minimal hardware
- Developer-first: test-as-code philosophy with JavaScript scripting
- CLI-native, no GUI dependency — perfect for CI/CD automation
- Built-in metrics: p50/p95/p99 latencies, RPS, error rates out of the box
- Extensions ecosystem: xk6 for gRPC, SQL, Kafka, Redis, browser testing
- Native Grafana integration for real-time dashboards
- Threshold-based pass/fail for automated CI gates

**Limitations:**
- No native .NET SDK — tests written in JS, not C#
- Protocol support narrower than JMeter (focused on HTTP/gRPC/WebSocket)
- No record-and-playback; requires scripting knowledge

**Install:**
```bash
# Windows (winget)
winget install grafana.k6

# macOS
brew install k6

# Docker
docker run --rm -i grafana/k6 run - <script.js
```

**Best For:** API load testing, CI/CD integration, developer-driven performance testing

---

### 1.2 NBomber (.NET-Native Load Testing)

**Version:** 6.1.2 (October 2025)
**Language:** C# / F#
**License:** Free for personal use; commercial license required for organizations (v5+)

**Strengths:**
- Native .NET integration — write tests in C# with full IDE support (IntelliSense, debugging)
- Test any protocol: HTTP, WebSocket, gRPC, SQL, MongoDB, Redis
- Rich load simulation API: Inject, RampingInject, KeepConstant, InjectPerSec
- Real-time monitoring via NBomber Studio with InfluxDB/TimescaleDB/Grafana
- Multi-step scenarios with data correlation between steps
- Distribute load across multiple agents

**Limitations:**
- Commercial licensing for organizational use since v5
- Smaller community compared to k6 or JMeter
- Less CI/CD tooling ecosystem than k6

**Install:**
```bash
dotnet new console -n LoadTests -lang "C#"
cd LoadTests
dotnet add package NBomber
dotnet add package NBomber.Http
```

**Best For:** .NET teams wanting native C# test authoring, complex multi-step scenarios

---

### 1.3 Apache JMeter

**Version:** 5.6.3+ (2025)
**Language:** Java (GUI + JMX files, Groovy/BeanShell scripting)
**License:** Apache 2.0 (fully free and open source)

**Strengths:**
- Broadest protocol support: HTTP, JDBC, LDAP, JMS, FTP, SOAP, REST, TCP
- Massive plugin ecosystem (hundreds of plugins)
- Record-and-playback via HTTP(S) proxy recorder
- Distributed testing with controller/agent architecture
- Decades of enterprise adoption; extensive documentation

**Limitations:**
- Resource-heavy: Java-based, GUI mode consumes significant memory
- XML-based test plans (JMX) are hard to version-control meaningfully
- Not developer-friendly compared to code-first tools
- Slower feedback loop in CI/CD compared to k6

**Install:**
```bash
# Download from https://jmeter.apache.org/download_jmeter.cgi
# Or via Docker
docker run -it justb4/jmeter -n -t /tests/my-test.jmx -l /results/log.jtl
```

**Best For:** Complex multi-protocol testing, legacy enterprise environments, JDBC/database load testing

---

### 1.4 Locust

**Version:** 2.31+ (2025)
**Language:** Python
**License:** MIT (fully free and open source)

**Strengths:**
- Event-based architecture (gevent): simulates many concurrent users efficiently
- Python scripting: flexible, readable, full language power
- Built-in web UI for real-time monitoring
- Distributed mode scales to millions of users
- Easy custom protocols via Python libraries

**Limitations:**
- Python dependency and ecosystem
- HTTP-focused; other protocols need custom code
- Single-threaded per worker process (GIL limitation)
- Less granular metrics compared to k6

**Install:**
```bash
pip install locust
```

**Best For:** Python-savvy teams, quick prototyping, distributed scale testing

---

### 1.5 Artillery

**Version:** 2.0+ (2025)
**Language:** Node.js (YAML + JavaScript)
**License:** MPL-2.0 (OSS), Artillery Pro (commercial)

**Strengths:**
- YAML-first configuration with JS hooks for complex logic
- Easy setup: npm install and go
- Built-in support for HTTP, WebSocket, Socket.io, gRPC
- Cloud distribution via Artillery Pro
- Good for serverless/microservice testing

**Limitations:**
- Narrower protocol support than JMeter
- Less mature than k6 for large-scale testing
- Node.js single-threaded limitations

**Install:**
```bash
npm install -g artillery
```

**Best For:** Node.js teams, serverless applications, quick YAML-based test setup

---

### 1.6 Comparison Matrix for .NET Workloads

| Feature | k6 | NBomber | JMeter | Locust | Artillery |
|---------|-----|---------|--------|--------|-----------|
| **Language** | JavaScript | C#/F# | Java/Groovy | Python | YAML/JS |
| **.NET Native** | No | Yes | No | No | No |
| **Resource Efficiency** | Excellent | Good | Poor | Good | Good |
| **CI/CD Integration** | Excellent | Good | Fair | Good | Good |
| **Protocol Breadth** | Medium | Medium | Excellent | Medium | Medium |
| **Learning Curve** | Low | Low (.NET devs) | Medium | Low | Low |
| **Distributed Testing** | Cloud/OSS | Built-in | Built-in | Built-in | Cloud |
| **Real-time Dashboard** | Grafana | Studio/Grafana | Listeners | Web UI | Cloud |
| **Cost** | Free OSS | Commercial (org) | Free OSS | Free OSS | Free/Pro |
| **Threshold Gates** | Built-in | Config | Plugin | Custom | Built-in |
| **Scripting Power** | High | Highest (.NET) | Medium | High | Medium |

**Recommendation for .NET teams:**
- **Primary:** k6 for API load testing + CI/CD gates
- **Secondary:** NBomber for complex .NET-native scenarios requiring C# debugging
- **Database-specific:** JMeter for JDBC/SQL load testing when needed

---

## 2. Benchmark Methodologies

### 2.1 Establishing Performance Baselines

A baseline is the known-good performance profile measured under normal operating conditions:

**Step-by-step process:**
1. **Define normal load**: Analyze production traffic patterns (users, RPS, peak hours)
2. **Identify critical paths**: List the 10-20 most important API endpoints
3. **Run smoke test**: 1 VU for 1 minute — verify the system works at all
4. **Run baseline test**: Expected concurrent users for 10 minutes
5. **Record metrics**: p50, p95, p99 latency; RPS; error rate; CPU/memory utilization
6. **Store as reference**: These numbers become the regression detection baseline

```
Baseline Template:
  Endpoint: POST /api/orders
  Normal Load: 50 concurrent users
  Baseline p50: 120ms
  Baseline p95: 350ms
  Baseline p99: 800ms
  Baseline RPS: 420
  Baseline Error Rate: 0.01%
  CPU @ Normal Load: 45%
  Memory @ Normal Load: 2.1GB
```

### 2.2 Load Test Patterns

#### Smoke Test
**Purpose:** Verify the system works under minimal load
**Pattern:** 1-5 VUs for 1-3 minutes
**Detects:** Configuration errors, deployment failures, basic connectivity issues

#### Step Ramp-Up
**Purpose:** Find the throughput ceiling and optimal operating point
**Pattern:** Increase VUs in discrete steps (10, 25, 50, 100, 200, 500)
**Duration:** Hold each step for 2-5 minutes to reach steady state
**Detects:** Saturation points, linear vs non-linear scaling behavior

#### Linear Ramp-Up
**Purpose:** Smooth load increase to observe gradual degradation
**Pattern:** 0 to max VUs over 10-30 minutes
**Detects:** Inflection points where latency starts increasing non-linearly

#### Spike Test
**Purpose:** Test sudden traffic surges (flash sales, viral events)
**Pattern:** Instant jump from normal to 5-10x load, hold 2-5 minutes, instant drop
**Detects:** Auto-scaling response time, connection pool exhaustion, thread starvation

#### Soak Test (Endurance Test)
**Purpose:** Find memory leaks, connection leaks, handle fragmentation
**Pattern:** Steady moderate load for 2-8 hours (or overnight)
**Detects:** Memory growth, GC pressure escalation, file handle leaks, log rotation issues
**Key Metrics to Watch:**
- Gen2 GC collection frequency trending upward
- Working set memory monotonically increasing
- Connection pool size growing without shrinking
- Thread count creeping upward

#### Stress Test
**Purpose:** Find the breaking point and observe failure modes
**Pattern:** Increase load until errors exceed 5-10% or latencies become unacceptable
**Detects:** Maximum capacity, failure cascading, recovery behavior

### 2.3 Chaos Engineering

**Simmy / Polly v8 (In-Process Chaos for .NET):**
- Polly v8.3.0+ integrates Simmy directly
- Four chaos strategies: Fault, Outcome, Latency, Behavior
- Configurable injection rates and enable/disable per environment

**LitmusChaos (Kubernetes-Native):**
- CNCF-hosted open-source platform
- YAML-defined experiments: pod kill, network delay, CPU stress, disk fill
- ChaosHub provides pre-built experiments
- Integrates with CI/CD for automated resilience testing

**Key Chaos Experiments for .NET:**
1. **Network latency injection** (100-500ms added to DB calls)
2. **Pod/process termination** under load
3. **CPU/memory pressure** on application servers
4. **Database connection rejection** (simulate pool exhaustion)
5. **DNS resolution failure** for downstream services
6. **Disk I/O throttling** for applications with file system dependencies

**Best Practices:**
- Start in staging, never production first
- Minimize blast radius (one service, one experiment)
- Always have a kill switch / rollback mechanism
- Run during business hours when team is available to respond
- Document hypotheses and results

---

## 3. Performance Profiling for .NET

### 3.1 .NET CLI Diagnostic Tools

These cross-platform tools use EventPipe and work on Windows, Linux, macOS, and in containers.

#### dotnet-counters (Real-Time Monitoring)

```bash
# Install
dotnet tool install --global dotnet-counters

# Monitor a running process (by PID)
dotnet-counters monitor --process-id 12345

# Monitor specific providers
dotnet-counters monitor --process-id 12345 \
  --counters System.Runtime,Microsoft.AspNetCore.Hosting,Microsoft.EntityFrameworkCore

# Export to CSV for analysis
dotnet-counters collect --process-id 12345 \
  --format csv \
  --output counters.csv \
  --refresh-interval 3

# Key counters to watch:
#   System.Runtime:
#     cpu-usage, working-set, gc-heap-size, gen-0/1/2-gc-count,
#     threadpool-thread-count, threadpool-queue-length,
#     exception-count, alloc-rate
#   Microsoft.AspNetCore.Hosting:
#     requests-per-second, total-requests, current-requests,
#     failed-requests
#   Microsoft.EntityFrameworkCore:
#     active-db-contexts, queries-per-second,
#     optimistic-concurrency-failures
```

#### dotnet-trace (Detailed Profiling)

```bash
# Install
dotnet tool install --global dotnet-trace

# Collect trace for 30 seconds
dotnet-trace collect --process-id 12345 --duration 00:00:30

# Collect with specific profile
dotnet-trace collect --process-id 12345 --profile cpu-sampling

# Available profiles:
#   cpu-sampling        - CPU method-level profiling
#   gc-verbose          - Detailed GC events
#   gc-collect          - GC collection events at low overhead
#   database            - ADO.NET and EF Core events

# Convert to SpeedScope format for visualization
dotnet-trace convert trace.nettrace --format Speedscope

# Convert to Chromium format
dotnet-trace convert trace.nettrace --format Chromium

# Open in PerfView, SpeedScope (https://speedscope.app), or VS Profiler
```

#### dotnet-dump (Memory Analysis)

```bash
# Install
dotnet tool install --global dotnet-dump

# Capture a dump
dotnet-dump collect --process-id 12345

# Analyze the dump
dotnet-dump analyze core_20260219_123456

# Inside the analyzer:
#   > dumpheap -stat              # Heap summary by type
#   > dumpheap -type System.String # All strings on heap
#   > gcroot <address>            # Find what holds a reference
#   > dumpobj <address>           # Inspect specific object
#   > eeheap -gc                  # GC heap segments info
#   > threadpool                  # Thread pool statistics
#   > threads                     # List all managed threads
```

#### dotnet-gcdump (GC Heap Snapshots)

```bash
# Install
dotnet tool install --global dotnet-gcdump

# Collect GC dump
dotnet-gcdump collect --process-id 12345

# Compare two dumps to find leaks
# Open .gcdump files in Visual Studio or PerfView
# Look for: types with growing instance counts between snapshots
```

#### dotnet-monitor (Production Diagnostics)

```bash
# Install
dotnet tool install --global dotnet-monitor

# Run alongside your app
dotnet-monitor collect

# Exposes REST API for on-demand diagnostics:
#   GET /processes              - List monitored processes
#   GET /dump/{pid}             - Collect dump
#   GET /trace/{pid}            - Collect trace
#   GET /metrics                - Prometheus-format metrics
#   GET /livemetrics/{pid}      - Real-time metrics stream

# Configure automated collection rules:
# Trigger trace when CPU > 80% for 30 seconds
# Trigger dump when memory > 4GB
```

### 3.2 BenchmarkDotNet (Micro-Benchmarks)

**Version:** 0.14+ (2025-2026, now under dotnet org on GitHub)

```bash
dotnet add package BenchmarkDotNet
```

**Example: Benchmarking EF Core Query Strategies**

```csharp
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;
using Microsoft.EntityFrameworkCore;

[MemoryDiagnoser]         // Track allocations
[ThreadingDiagnoser]      // Track thread pool usage
[SimpleJob(RuntimeMoniker.Net80)]
[SimpleJob(RuntimeMoniker.Net90)]  // Cross-version comparison
public class EfCoreBenchmarks
{
    private AppDbContext _context = null!;

    [GlobalSetup]
    public void Setup()
    {
        _context = new AppDbContext(/* options */);
    }

    [Benchmark(Baseline = true)]
    public async Task<List<Order>> TrackingQuery()
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.Status == OrderStatus.Active)
            .ToListAsync();
    }

    [Benchmark]
    public async Task<List<Order>> NoTrackingQuery()
    {
        return await _context.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.Status == OrderStatus.Active)
            .ToListAsync();
    }

    [Benchmark]
    public async Task<List<Order>> CompiledQuery()
    {
        return await CompiledQueries.GetActiveOrders(_context).ToListAsync();
    }

    [Benchmark]
    public async Task<List<OrderDto>> ProjectionQuery()
    {
        return await _context.Orders
            .AsNoTracking()
            .Where(o => o.Status == OrderStatus.Active)
            .Select(o => new OrderDto
            {
                Id = o.Id,
                Total = o.Items.Sum(i => i.Price * i.Quantity)
            })
            .ToListAsync();
    }
}

// Run:
// dotnet run -c Release
// BenchmarkRunner.Run<EfCoreBenchmarks>();
```

### 3.3 Memory Profiling Tools

| Tool | Type | Cost | Best For |
|------|------|------|----------|
| **PerfView** | ETW-based | Free (Microsoft) | Production memory analysis, GC investigation |
| **dotMemory** | Snapshot-based | JetBrains license | Visual memory leak hunting, retention graphs |
| **dotnet-gcdump** | CLI GC snapshots | Free | Container/Linux memory analysis |
| **Visual Studio Profiler** | Integrated | VS license | Development-time profiling |

**PerfView Commands:**
```bash
# Collect heap snapshot
PerfView /GCCollectOnly collect

# Collect with CPU sampling
PerfView /ThreadTime collect

# Analyze GC events
PerfView /GCOnly collect

# Generate flame graph (built-in since 2024)
# View > Any Stacks > Flame Graph tab
```

### 3.4 CPU Profiling & Flame Graphs

**Workflow:**
1. Collect a trace: `dotnet-trace collect --process-id <PID> --profile cpu-sampling`
2. Convert: `dotnet-trace convert trace.nettrace --format Speedscope`
3. Open in [SpeedScope](https://speedscope.app) or import into PerfView
4. Look for: wide bars (high CPU time), deep stacks (excessive abstraction)

**Key patterns to identify:**
- Hot methods consuming >5% of total CPU
- Lock contention (Monitor.Enter showing in flame graph)
- Excessive GC time (>10% of total time)
- JIT compilation overhead on startup
- LINQ allocations in hot paths

### 3.5 EF Core Query Logging & Slow Query Detection

**Built-in Logging:**
```csharp
// In Program.cs or DbContext configuration
builder.Services.AddDbContext<AppDbContext>(options =>
    options
        .UseSqlServer(connectionString)
        .LogTo(Console.WriteLine, LogLevel.Information)
        .EnableSensitiveDataLogging()  // Shows parameter values (dev only!)
        .EnableDetailedErrors());
```

**Custom Slow Query Interceptor:**
```csharp
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Data.Common;
using System.Diagnostics;

public class SlowQueryInterceptor : DbCommandInterceptor
{
    private readonly ILogger<SlowQueryInterceptor> _logger;
    private readonly TimeSpan _threshold;

    public SlowQueryInterceptor(
        ILogger<SlowQueryInterceptor> logger,
        TimeSpan? threshold = null)
    {
        _logger = logger;
        _threshold = threshold ?? TimeSpan.FromMilliseconds(500);
    }

    public override ValueTask<DbDataReader> ReaderExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        DbDataReader result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Duration > _threshold)
        {
            _logger.LogWarning(
                "SLOW QUERY ({Duration}ms): {CommandText}",
                eventData.Duration.TotalMilliseconds,
                command.CommandText);
        }
        return new ValueTask<DbDataReader>(result);
    }
}

// Register in DbContext:
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    optionsBuilder.AddInterceptors(
        new SlowQueryInterceptor(logger, TimeSpan.FromMilliseconds(200)));
}
```

---

## 4. Key Performance Indicators (KPIs)

### 4.1 Primary Metrics

| Metric | Description | Good Target | Alarm Threshold |
|--------|-------------|-------------|-----------------|
| **RPS** | Requests per second throughput | Depends on baseline | <80% of baseline |
| **p50 Latency** | Median response time | <100ms (API) | >200ms |
| **p95 Latency** | 95th percentile response time | <500ms | >1000ms |
| **p99 Latency** | 99th percentile (tail latency) | <1000ms | >3000ms |
| **p99.9 Latency** | 99.9th percentile | <3000ms | >5000ms |
| **Error Rate** | % of 5xx responses | <0.1% | >1% |
| **Throughput Saturation** | RPS where latency spikes | Identify point | N/A |

### 4.2 Resource Utilization Curves

Track these alongside load metrics to understand capacity:

| Resource | Normal | Warning | Critical |
|----------|--------|---------|----------|
| **CPU** | <60% | 60-80% | >80% |
| **Memory (Working Set)** | <70% | 70-85% | >85% |
| **Thread Pool Queue** | 0-10 | 10-50 | >50 |
| **GC Pause Time** | <10ms | 10-50ms | >50ms |
| **DB Connection Pool** | <50% used | 50-80% | >80% |
| **Network I/O** | <50% bandwidth | 50-80% | >80% |

### 4.3 Derived Metrics

```
Apdex Score = (Satisfied + Tolerating/2) / Total
  Satisfied:  response time <= T (e.g., 500ms)
  Tolerating: response time <= 4T (e.g., 2000ms)
  Frustrated: response time > 4T

Throughput Efficiency = RPS / CPU_Cores_Used
  Higher = better resource utilization

Error Budget Burn Rate = (Error Rate / SLO Error Budget) * Time Period
  >1.0 = burning budget faster than allowed
```

---

## 5. Continuous Performance Testing in CI/CD

### 5.1 Tiered Testing Strategy

```
┌────────────────────────────────────────────────────┐
│ Per-Commit (Every PR):                             │
│   Smoke test: 1 VU, 30s, verify <500ms p95        │
│   Duration: ~1 minute                              │
│   Gate: Pass/Fail threshold                        │
├────────────────────────────────────────────────────┤
│ Per-Merge (Main branch):                           │
│   Load test: 50 VUs, 5 min ramp, 5 min steady     │
│   Duration: ~12 minutes                            │
│   Gate: Compare to baseline ±10%                   │
├────────────────────────────────────────────────────┤
│ Nightly:                                           │
│   Stress test: ramp to 500 VUs, find breaking point│
│   Soak test: 100 VUs for 2 hours                   │
│   Duration: ~3 hours                               │
│   Gate: Memory growth <5%, error rate <0.5%        │
├────────────────────────────────────────────────────┤
│ Pre-Release:                                       │
│   Full suite: smoke + load + stress + soak + spike │
│   Chaos experiments                                │
│   Duration: ~8 hours                               │
│   Gate: All SLOs met                               │
└────────────────────────────────────────────────────┘
```

### 5.2 GitHub Actions Integration with k6

```yaml
# .github/workflows/performance.yml
name: Performance Tests
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    services:
      sqlserver:
        image: mcr.microsoft.com/mssql/server:2022-latest
        env:
          ACCEPT_EULA: Y
          SA_PASSWORD: TestPassword123!
        ports:
          - 1433:1433
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'

      - name: Build and run application
        run: |
          dotnet build src/MyApp -c Release
          dotnet run --project src/MyApp -c Release &
          sleep 10  # Wait for startup

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
            sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update && sudo apt-get install k6

      - name: Run smoke test
        run: k6 run tests/performance/smoke-test.js

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-smoke-results
          path: results/

  load-test:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      # ... (same setup as smoke-test)

      - name: Run load test
        run: k6 run tests/performance/load-test.js

      - name: Compare with baseline
        run: |
          # Compare current results against stored baseline
          python scripts/compare-performance.py \
            --baseline baselines/load-test.json \
            --current results/load-test.json \
            --threshold 10

  nightly-stress:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v4
      # ... (same setup)

      - name: Run stress test
        run: k6 run tests/performance/stress-test.js
        timeout-minutes: 60

      - name: Run soak test
        run: k6 run tests/performance/soak-test.js
        timeout-minutes: 180
```

### 5.3 Azure DevOps Integration with k6

```yaml
# azure-pipelines-perf.yml
trigger:
  branches:
    include: [main]

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: PerformanceTest
    jobs:
      - job: LoadTest
        steps:
          - task: k6-load-test@0
            inputs:
              filename: 'tests/performance/load-test.js'
            displayName: 'Run k6 load test'

          - script: |
              if [ $? -ne 0 ]; then
                echo "##vso[task.logissue type=error]Performance thresholds breached!"
                exit 1
              fi
            displayName: 'Check thresholds'
```

### 5.4 Performance Regression Detection

**Automated Baseline Comparison:**
```javascript
// k6 script with threshold-based regression detection
export const options = {
    thresholds: {
        // Absolute thresholds
        'http_req_duration': ['p(95)<500', 'p(99)<1500'],
        'http_req_failed': ['rate<0.01'],
        'http_reqs': ['rate>100'],  // Minimum RPS

        // Per-endpoint thresholds
        'http_req_duration{name:GetOrders}': ['p(95)<300'],
        'http_req_duration{name:CreateOrder}': ['p(95)<800'],
        'http_req_duration{name:SearchProducts}': ['p(95)<400'],
    },
};
```

**Tracking Over Time:**
- Export k6 results to InfluxDB/TimescaleDB
- Build Grafana dashboards showing p95 trends per endpoint
- Set Grafana alerts for >10% deviation from 7-day rolling average

---

## 6. Database Performance Testing

### 6.1 SQL Query Benchmarking

**Using BenchmarkDotNet:**
```csharp
[MemoryDiagnoser]
public class QueryBenchmarks
{
    [Benchmark]
    public async Task RawSql()
    {
        await using var conn = new SqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT TOP 100 * FROM Orders WHERE Status = @status";
        cmd.Parameters.AddWithValue("@status", 1);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync()) { /* map */ }
    }

    [Benchmark]
    public async Task EfCoreLinq()
    {
        await using var ctx = _contextFactory.CreateDbContext();
        var orders = await ctx.Orders
            .AsNoTracking()
            .Where(o => o.Status == OrderStatus.Active)
            .Take(100)
            .ToListAsync();
    }

    [Benchmark]
    public async Task DapperQuery()
    {
        await using var conn = new SqlConnection(_connString);
        var orders = await conn.QueryAsync<Order>(
            "SELECT TOP 100 * FROM Orders WHERE Status = @Status",
            new { Status = 1 });
    }
}
```

### 6.2 Connection Pool Stress Testing

**k6 script targeting connection pool limits:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    scenarios: {
        connection_pool_stress: {
            executor: 'ramping-arrival-rate',
            startRate: 10,
            timeUnit: '1s',
            preAllocatedVUs: 500,
            maxVUs: 1000,
            stages: [
                { duration: '30s', target: 50 },    // Normal
                { duration: '30s', target: 200 },   // Push pool limits
                { duration: '30s', target: 500 },   // Exceed pool size
                { duration: '30s', target: 1000 },  // Far beyond pool
                { duration: '1m', target: 50 },     // Recovery
            ],
        },
    },
    thresholds: {
        'http_req_duration': ['p(95)<2000'],
        'http_req_failed': ['rate<0.05'],
    },
};

export default function () {
    // Hit an endpoint that requires a DB connection
    const res = http.get('http://localhost:5000/api/orders?page=1&size=50');
    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 2s': (r) => r.timings.duration < 2000,
    });
}
```

**Monitor with dotnet-counters during test:**
```bash
dotnet-counters monitor --process-id <PID> \
  --counters "Microsoft.Data.SqlClient:active-hard-connections,active-soft-connects,\
hard-connects,hard-disconnects,active-connection-pool-groups,\
number-of-free-connections,number-of-stasis-connections"
```

### 6.3 Deadlock Detection Under Concurrency

**NBomber scenario for deadlock testing:**
```csharp
var deadlockScenario = Scenario.Create("deadlock_test", async context =>
{
    var httpClient = Http.CreateDefaultClient();

    // Simulate concurrent operations on overlapping resources
    var tasks = new[]
    {
        Http.Send(httpClient,
            Http.CreateRequest("PUT", "http://localhost:5000/api/inventory/item-1")
                .WithJsonBody(new { Quantity = Random.Shared.Next(1, 100) })),
        Http.Send(httpClient,
            Http.CreateRequest("PUT", "http://localhost:5000/api/inventory/item-2")
                .WithJsonBody(new { Quantity = Random.Shared.Next(1, 100) })),
    };

    var responses = await Task.WhenAll(tasks);
    return responses.All(r => r.IsSuccessStatusCode)
        ? Response.Ok()
        : Response.Fail();
})
.WithLoadSimulations(
    Simulation.Inject(rate: 100, interval: TimeSpan.FromSeconds(1),
                      during: TimeSpan.FromMinutes(5))
);
```

**SQL Server Deadlock Monitoring:**
```sql
-- Enable deadlock monitoring with Extended Events
CREATE EVENT SESSION [DeadlockMonitor] ON SERVER
ADD EVENT sqlserver.xml_deadlock_report
ADD TARGET package0.event_file(SET filename=N'deadlocks.xel')
WITH (STARTUP_STATE=ON);
GO
ALTER EVENT SESSION [DeadlockMonitor] ON SERVER STATE = START;
GO

-- Query recent deadlocks
SELECT
    event_data.value('(event/@timestamp)[1]', 'datetime2') AS deadlock_time,
    event_data.query('(event/data/value/deadlock)[1]') AS deadlock_graph
FROM (
    SELECT CAST(event_data AS xml) AS event_data
    FROM sys.fn_xe_file_target_read_file('deadlocks*.xel', NULL, NULL, NULL)
) AS tab;
```

---

## 7. Chaos Engineering for .NET

### 7.1 Polly v8 + Simmy (In-Process Fault Injection)

```csharp
using Microsoft.Extensions.DependencyInjection;
using Polly;

var builder = WebApplication.CreateBuilder(args);

// Register chaos manager
builder.Services.TryAddSingleton<IChaosManager, ChaosManager>();

// Add HTTP client with resilience + chaos
builder.Services.AddHttpClient<OrderServiceClient>(
    client => client.BaseAddress = new Uri("https://orders-api.internal"))
    .AddStandardResilienceHandler()      // Retry, circuit breaker, timeout
    .AddResilienceHandler("chaos", (ResiliencePipelineBuilder<HttpResponseMessage> b) =>
    {
        b.AddChaosLatency(0.05, TimeSpan.FromSeconds(5))    // 5% get 5s delay
         .AddChaosFault(0.02, () => new HttpRequestException("Chaos!"))  // 2% throw
         .AddChaosOutcome(0.02, () =>                        // 2% get 500
             new HttpResponseMessage(System.Net.HttpStatusCode.InternalServerError));
    });
```

### 7.2 LitmusChaos Kubernetes Experiments

```yaml
# litmus-pod-delete.yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: dotnet-api-chaos
spec:
  appinfo:
    appns: production
    applabel: "app=orders-api"
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "60"
            - name: CHAOS_INTERVAL
              value: "10"
            - name: FORCE
              value: "false"
```

---

## 8. Complete Code Examples

### 8.1 Comprehensive k6 Load Test for .NET API

```javascript
// tests/performance/comprehensive-load-test.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const orderCreateDuration = new Trend('order_create_duration');
const orderListDuration = new Trend('order_list_duration');
const loginDuration = new Trend('login_duration');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export const options = {
    scenarios: {
        // Scenario 1: Ramp up and sustain load
        sustained_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 50 },    // Ramp to 50 users
                { duration: '5m', target: 50 },    // Stay at 50 for 5 min
                { duration: '2m', target: 100 },   // Ramp to 100
                { duration: '5m', target: 100 },   // Stay at 100 for 5 min
                { duration: '2m', target: 0 },     // Ramp down
            ],
            gracefulRampDown: '30s',
        },
        // Scenario 2: Spike test (starts 10 min in)
        spike: {
            executor: 'ramping-vus',
            startVUs: 0,
            startTime: '10m',
            stages: [
                { duration: '10s', target: 300 },  // Spike to 300
                { duration: '1m', target: 300 },   // Hold spike
                { duration: '10s', target: 0 },    // Drop
            ],
        },
    },

    thresholds: {
        // Global thresholds
        'http_req_duration': ['p(95)<1000', 'p(99)<3000'],
        'http_req_failed': ['rate<0.02'],      // <2% errors

        // Per-endpoint thresholds
        'login_duration': ['p(95)<500'],
        'order_create_duration': ['p(95)<800'],
        'order_list_duration': ['p(95)<400'],

        // Custom error rate
        'errors': ['rate<0.05'],
    },
};

// Setup: runs once before the test
export function setup() {
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: 'loadtest@example.com',
        password: 'TestPassword123!',
    }), { headers: { 'Content-Type': 'application/json' } });

    check(loginRes, { 'login succeeded': (r) => r.status === 200 });
    return { token: loginRes.json('token') };
}

export default function (data) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`,
    };

    group('Browse Products', () => {
        const res = http.get(`${BASE_URL}/api/products?page=1&size=20`, { headers });
        check(res, {
            'products status 200': (r) => r.status === 200,
            'products returned': (r) => r.json('data').length > 0,
        });
        errorRate.add(res.status !== 200);
        sleep(1);
    });

    group('List Orders', () => {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api/orders?page=1&size=10`, { headers });
        orderListDuration.add(Date.now() - start);
        check(res, {
            'orders status 200': (r) => r.status === 200,
        });
        errorRate.add(res.status !== 200);
        sleep(0.5);
    });

    group('Create Order', () => {
        const start = Date.now();
        const payload = JSON.stringify({
            items: [
                { productId: 1, quantity: Math.ceil(Math.random() * 5) },
                { productId: 2, quantity: Math.ceil(Math.random() * 3) },
            ],
            shippingAddress: {
                street: '123 Load Test St',
                city: 'Test City',
                zipCode: '12345',
            },
        });
        const res = http.post(`${BASE_URL}/api/orders`, payload, { headers });
        orderCreateDuration.add(Date.now() - start);
        check(res, {
            'order created': (r) => r.status === 201 || r.status === 200,
        });
        errorRate.add(res.status !== 201 && res.status !== 200);
        sleep(2);
    });

    sleep(1); // Think time between iterations
}

// Teardown: runs once after the test
export function teardown(data) {
    // Clean up test data if needed
    http.del(`${BASE_URL}/api/test/cleanup`, null, {
        headers: { 'Authorization': `Bearer ${data.token}` },
    });
}
```

**Running:**
```bash
# Smoke test
k6 run --vus 1 --duration 30s tests/performance/comprehensive-load-test.js

# With environment variable
k6 run -e BASE_URL=https://staging.myapp.com tests/performance/comprehensive-load-test.js

# Output to JSON for CI comparison
k6 run --out json=results.json tests/performance/comprehensive-load-test.js

# Output to InfluxDB for dashboards
k6 run --out influxdb=http://localhost:8086/k6 tests/performance/comprehensive-load-test.js

# Output to Grafana Cloud k6
K6_CLOUD_TOKEN=<token> k6 run --out cloud tests/performance/comprehensive-load-test.js
```

---

### 8.2 Comprehensive NBomber Scenario for .NET API

```csharp
using System.Net.Http.Json;
using NBomber.CSharp;
using NBomber.Http;
using NBomber.Http.CSharp;

namespace LoadTests;

public class ComprehensiveLoadTest
{
    private const string BaseUrl = "http://localhost:5000";

    public static void Run()
    {
        using var httpClient = new HttpClient
        {
            BaseAddress = new Uri(BaseUrl),
            Timeout = TimeSpan.FromSeconds(30)
        };

        // Scenario 1: Browse + Read Flow
        var browseScenario = Scenario.Create("browse_flow", async context =>
        {
            // Step 1: List products
            var listResponse = await Step.Run("list_products", context, async () =>
            {
                var request = Http.CreateRequest("GET", $"{BaseUrl}/api/products?page=1&size=20")
                    .WithHeader("Accept", "application/json");
                return await Http.Send(httpClient, request);
            });

            if (!listResponse.IsOk) return Response.Fail();

            // Step 2: Get product detail
            var detailResponse = await Step.Run("get_product", context, async () =>
            {
                var productId = Random.Shared.Next(1, 100);
                var request = Http.CreateRequest("GET", $"{BaseUrl}/api/products/{productId}")
                    .WithHeader("Accept", "application/json");
                return await Http.Send(httpClient, request);
            });

            return detailResponse;
        })
        .WithoutWarmUp()
        .WithLoadSimulations(
            Simulation.RampingInject(rate: 50, interval: TimeSpan.FromSeconds(1),
                                     during: TimeSpan.FromMinutes(2)),
            Simulation.Inject(rate: 50, interval: TimeSpan.FromSeconds(1),
                              during: TimeSpan.FromMinutes(5)),
            Simulation.RampingInject(rate: 0, interval: TimeSpan.FromSeconds(1),
                                     during: TimeSpan.FromMinutes(1))
        );

        // Scenario 2: Order Creation Flow
        var orderScenario = Scenario.Create("order_flow", async context =>
        {
            // Step 1: Login
            var loginResponse = await Step.Run("login", context, async () =>
            {
                var request = Http.CreateRequest("POST", $"{BaseUrl}/api/auth/login")
                    .WithJsonBody(new { email = "test@example.com", password = "Test123!" });
                return await Http.Send(httpClient, request);
            });

            if (!loginResponse.IsOk) return Response.Fail();

            // Step 2: Create order
            var orderResponse = await Step.Run("create_order", context, async () =>
            {
                var request = Http.CreateRequest("POST", $"{BaseUrl}/api/orders")
                    .WithHeader("Authorization", "Bearer <token>")
                    .WithJsonBody(new
                    {
                        items = new[]
                        {
                            new { productId = Random.Shared.Next(1, 50), quantity = 2 },
                            new { productId = Random.Shared.Next(51, 100), quantity = 1 }
                        }
                    });
                return await Http.Send(httpClient, request);
            });

            return orderResponse;
        })
        .WithoutWarmUp()
        .WithLoadSimulations(
            Simulation.RampingInject(rate: 20, interval: TimeSpan.FromSeconds(1),
                                     during: TimeSpan.FromMinutes(2)),
            Simulation.Inject(rate: 20, interval: TimeSpan.FromSeconds(1),
                              during: TimeSpan.FromMinutes(5)),
            Simulation.RampingInject(rate: 0, interval: TimeSpan.FromSeconds(1),
                                     during: TimeSpan.FromMinutes(1))
        );

        // Run both scenarios simultaneously
        NBomberRunner
            .RegisterScenarios(browseScenario, orderScenario)
            .WithReportFormats(ReportFormat.Html, ReportFormat.Csv)
            .WithReportFolder("./reports")
            .Run();
    }
}

// Program.cs
ComprehensiveLoadTest.Run();
```

**Running:**
```bash
cd LoadTests
dotnet run -c Release
# Reports generated in ./reports/ folder
```

---

### 8.3 k6 Test Suite by Test Type (ASP.NET Core)

#### Smoke Test
```javascript
// tests/performance/smoke-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 1,
    duration: '1m',
    thresholds: {
        'http_req_duration': ['p(95)<1000'],
        'http_req_failed': ['rate==0'],
    },
};

export default function () {
    const res = http.get('http://localhost:5000/health');
    check(res, { 'health check OK': (r) => r.status === 200 });
    sleep(1);
}
```

#### Load Test (Step Ramp)
```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '2m', target: 10 },    // Below normal load
        { duration: '5m', target: 10 },    // Stay at 10
        { duration: '2m', target: 50 },    // Normal load
        { duration: '5m', target: 50 },    // Stay at 50
        { duration: '2m', target: 100 },   // Around peak
        { duration: '5m', target: 100 },   // Stay at 100
        { duration: '5m', target: 0 },     // Ramp down
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500', 'p(99)<1500'],
        'http_req_failed': ['rate<0.01'],
    },
};

export default function () {
    const res = http.get('http://localhost:5000/api/products');
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
}
```

#### Stress Test (Find Breaking Point)
```javascript
// tests/performance/stress-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '2m', target: 50 },    // Normal
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },   // Peak
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },   // Beyond peak
        { duration: '5m', target: 200 },
        { duration: '2m', target: 500 },   // Breaking point?
        { duration: '5m', target: 500 },
        { duration: '5m', target: 0 },     // Recovery
    ],
    thresholds: {
        'http_req_duration': ['p(95)<3000'],
        'http_req_failed': ['rate<0.10'],   // Allow 10% during stress
    },
};

export default function () {
    const res = http.get('http://localhost:5000/api/orders');
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(0.5);
}
```

#### Spike Test
```javascript
// tests/performance/spike-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '1m', target: 10 },    // Warm up
        { duration: '10s', target: 500 },   // Spike!
        { duration: '3m', target: 500 },    // Hold spike
        { duration: '10s', target: 10 },    // Drop
        { duration: '3m', target: 10 },     // Recovery period
        { duration: '1m', target: 0 },      // Cool down
    ],
    thresholds: {
        'http_req_duration': ['p(95)<5000'],
        'http_req_failed': ['rate<0.15'],   // Spikes may cause errors
    },
};

export default function () {
    const res = http.get('http://localhost:5000/api/products');
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(0.5);
}
```

#### Soak Test (Memory Leak Detection)
```javascript
// tests/performance/soak-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '5m', target: 50 },    // Ramp up
        { duration: '4h', target: 50 },    // Soak for 4 hours
        { duration: '5m', target: 0 },     // Ramp down
    ],
    thresholds: {
        'http_req_duration': ['p(95)<800'],
        'http_req_failed': ['rate<0.01'],
    },
};

export default function () {
    // Mix of endpoints to simulate realistic traffic
    const endpoints = [
        '/api/products',
        '/api/orders',
        '/api/customers',
        '/api/reports/summary',
    ];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const res = http.get(`http://localhost:5000${endpoint}`);
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(Math.random() * 3 + 1); // 1-4 second think time
}
```

---

## 9. Recommended Strategy for .NET Enterprise Applications

### 9.1 Tool Selection Matrix

| Use Case | Primary Tool | Secondary Tool |
|----------|-------------|----------------|
| API Load Testing | k6 | Artillery |
| .NET-Native Testing | NBomber | k6 |
| Micro-Benchmarks | BenchmarkDotNet | - |
| Database Load | JMeter (JDBC) | NBomber |
| Real-Time Monitoring | dotnet-counters | Grafana |
| Deep Profiling | dotnet-trace + PerfView | dotMemory |
| Memory Leak Detection | dotnet-gcdump + PerfView | dotMemory |
| Chaos Engineering | Polly v8 (Simmy) | LitmusChaos (K8s) |
| CI/CD Integration | k6 + GitHub Actions | Azure Load Testing |
| Production Diagnostics | dotnet-monitor | Application Insights |

### 9.2 Implementation Roadmap

**Phase 1 (Week 1-2): Foundation**
- Install k6, configure basic smoke/load test scripts
- Set up BenchmarkDotNet project for critical code paths
- Enable EF Core slow query interceptor in staging
- Establish baseline metrics for top 10 API endpoints

**Phase 2 (Week 3-4): CI/CD Integration**
- Add smoke tests to PR pipeline (GitHub Actions / Azure DevOps)
- Add load tests to main branch merge pipeline
- Set up nightly stress test schedule
- Configure Grafana dashboards for performance trends

**Phase 3 (Month 2): Advanced Testing**
- Implement soak tests for memory leak detection
- Add NBomber for complex multi-step .NET scenarios
- Configure connection pool stress tests
- Implement deadlock detection monitoring

**Phase 4 (Month 3): Chaos & Maturity**
- Integrate Polly v8 Simmy for fault injection
- Set up automated performance regression alerts
- Implement performance budgets per endpoint
- Document SLOs and performance contracts

---

## Sources

- [Grafana k6 Documentation](https://grafana.com/docs/k6/latest/)
- [k6 GitHub Repository](https://github.com/grafana/k6)
- [NBomber Official Site](https://nbomber.com/)
- [NBomber GitHub - v6.1.2](https://github.com/PragmaticFlow/NBomber)
- [BenchmarkDotNet](https://benchmarkdotnet.org/)
- [.NET Diagnostic Tools Overview - Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/tools-overview)
- [PerfView - Microsoft GitHub](https://github.com/microsoft/perfview)
- [Performance Testing ASP.NET Core with k6 - Code Maze](https://code-maze.com/aspnetcore-performance-testing-with-k6/)
- [Polly v8 Resilience & Chaos Engineering - .NET Blog](https://devblogs.microsoft.com/dotnet/resilience-and-chaos-engineering/)
- [LitmusChaos](https://litmuschaos.io/)
- [EF Core Performance Diagnosis - Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/performance/performance-diagnosis)
- [SQL Server Deadlocks Guide - Microsoft Learn](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-deadlocks-guide)
- [Continuous Performance Testing - Red Hat](https://developers.redhat.com/articles/2025/10/15/how-red-hat-has-redefined-continuous-performance-testing)
- [Integrating Performance Testing into CI/CD - DevOps.com](https://devops.com/integrating-performance-testing-into-ci-cd-a-practical-framework/)
- [k6 Azure Pipelines Extension](https://github.com/grafana/k6-azure-pipelines-extension)
- [Performance Tuning in .NET 8/9](https://developersvoice.com/blog/scalability/performance-tuning-in-dot-net-8/)
- [.NET Diagnostic Tools for Probing Your Application](https://improveandrepeat.com/2025/02/net-diagnostic-tools-for-probing-your-application/)
- [Complex Load Tests With NBomber](https://improveandrepeat.com/2025/02/complex-load-tests-with-nbomber/)
- [Top 5 Load Testing Tools 2025](https://www.testleaf.com/blog/5-best-load-testing-tools-in-2025/)
