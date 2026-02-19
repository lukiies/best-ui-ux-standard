# Cross-Platform Strategy - Research Findings

## Status: RESEARCHED (Feb 2026)

## Winner: Next.js (Web) + Expo/RN (Mobile) + PWA/Tauri (Desktop)

### Platform Strategy

| Platform | Technology | Experience | Maturity |
|----------|-----------|------------|----------|
| **Web** | Next.js 15 (App Router) | Full SPA/SSR | Production |
| **iOS** | Expo (React Native, New Arch) | Native | Production |
| **Android** | Expo (React Native, New Arch) | Native | Production |
| **Windows** | PWA primary, Tauri if needed | Desktop-class | Production |
| **macOS** | PWA (responsive web) | Web | Production |

### React Native + Expo (Mobile)

**Expo SDK 52+ with New Architecture (default since RN 0.76)**

Key facts:
- New Architecture = Fabric + TurboModules + Bridgeless (15-30% faster startup)
- Expo is officially recommended way to start React Native projects
- EAS Build: cloud builds, OTA updates, app store submission
- Expo Router v3+: file-based routing for iOS, Android, AND web
- Expo Modules API: write native modules in Swift/Kotlin
- ~85-90% top library compatibility with New Architecture

**Performance (New Architecture):**
- Cold start: 500-1200ms (vs 200-500ms full native)
- Scrolling: 55-60fps with FlashList
- Memory: 60-120MB typical (Hermes engine)

### Tauri 2.0 (Desktop Fallback)

When PWA isn't enough (native system tray, file system, auto-update):
- Bundle: 2-10MB (vs 150-300MB Electron)
- Memory: 30-80MB (vs 150-400MB Electron)
- Backend: Rust (secure, performant)
- Uses OS native webview (WebView2 on Windows)

### PWA Strategy

**Windows**: Excellent support (Edge/Chrome). Store-listable. Full push notifications.
**macOS**: Good via Chrome/Edge. Safari improving.
**iOS**: Limited. Push only from Home Screen. No background sync. Storage eviction risk.

**Conclusion**: PWA for desktop (Win/Mac). NOT as primary mobile experience.

### Code Sharing (Monorepo)

| Layer | Share % | Notes |
|-------|---------|-------|
| Types/interfaces | 100% | Fully portable |
| API client | 90-95% | Minor platform differences |
| Business logic | 90-95% | Pure functions |
| Validation (Zod) | 100% | Fully portable |
| State (Zustand) | 85-90% | Persistence differs |
| UI Components | 30-60% | Platform-specific UI |
| Navigation | 0-10% | Different routers |
| **Overall** | **60-75%** | Weighted average |
