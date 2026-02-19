# .NET Container Orchestration & Deployment on Dedicated Servers

## Status: RESEARCHED (Feb 2026)

## Docker Best Practices
- Multi-stage builds: SDK for build, runtime-deps for production
- Chiseled/distroless images reduce size to ~95MB (from 490MB baseline)
- Native AOT further reduces to ~60MB with 310ms startup
- NuGet cache mounts: `--mount=type=cache,id=nuget,target=/root/.nuget/packages`
- Always run as non-root USER, set `ASPNETCORE_URLS=http://+:8080`

## Kubernetes on Bare Metal
- **k3s**: Best for <100 nodes, single binary <100MB, includes Traefik/Flannel
- **k8s (kubeadm)**: Full-featured, for complex/large-scale production
- Cluster setup: containerd runtime, SystemdCgroup=true, disable swap
- CNI choice: Cilium (best perf, eBPF), Calico (best policies), Flannel (simplest)

## Storage
- Longhorn: Simplest, 15-20K IOPS, 200-400MB/node, best for small-medium
- Rook-Ceph: Enterprise, 25-35K IOPS, 1-2GB/node, block+object+file
- OpenEBS Mayastor: Highest perf, 45-60K IOPS, NVMe-oF

## Autoscaling
- HPA: CPU/memory based, autoscaling/v2 API
- VPA: Vertical resource right-sizing, updateMode: Auto
- KEDA: Event-driven, 59+ scalers, extends HPA with external metrics

## CI/CD
- GitHub Actions: docker/build-push-action + kubectl apply
- ArgoCD + Argo Rollouts: GitOps with blue-green/canary strategies
- Image tagging: Git commit SHA for immutable artifact traceability

## Ingress
- Traefik: Auto-discovery, built-in Let's Encrypt, best for dynamic environments
- NGINX: Most widely deployed, mature TLS termination
- HAProxy: Highest raw performance, 2x faster than competitors
