# .NET Load Testing & Performance Benchmarking

## Status: RESEARCHED (Feb 2026)
## Keywords: load-testing, stress-testing, k6, NBomber, JMeter, Locust, Artillery, BenchmarkDotNet, performance, profiling, chaos-engineering, CI/CD, database, deadlock, soak-test

## Summary
Comprehensive research on load testing tools, stress testing methodologies, performance
profiling, and continuous performance testing for large-scale .NET web applications.
Covers tool comparisons, benchmark patterns, KPI definitions, and CI/CD integration.

## Key Findings
- k6 (Grafana) is the recommended primary tool: JS scripting, Go runtime, excellent CI/CD integration
- NBomber v6.1.2 is best for .NET-native scenarios requiring C# debugging and multi-step flows
- BenchmarkDotNet is the gold standard for .NET micro-benchmarks (cross-runtime comparison)
- dotnet-counters/trace/dump/monitor provide free cross-platform production diagnostics
- Polly v8.3.0+ integrates Simmy chaos engineering directly (fault/latency/outcome/behavior injection)
- Tiered CI/CD strategy: smoke per-PR, load per-merge, stress+soak nightly, full suite pre-release
- Key KPIs: p50/p95/p99 latency, RPS, error rate, throughput saturation, resource utilization curves
- EF Core slow query detection via DbCommandInterceptor with configurable thresholds
- PerfView (free, Microsoft) + dotMemory (JetBrains) for memory leak investigation

## Full Report
See: `pre-requisites/dotnet-load-testing-performance-report.md`
