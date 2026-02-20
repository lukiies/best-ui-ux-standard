import type { NextConfig } from "next";

// Tauri sets TAURI_ENV_PLATFORM during `tauri build` / `tauri dev`.
// When building for desktop, we export static HTML that Tauri embeds.
const isTauriBuild = !!process.env.TAURI_ENV_PLATFORM;

const nextConfig: NextConfig = {
  output: isTauriBuild ? "export" : "standalone",
  transpilePackages: ["@repo/shared"],
  // Static export doesn't support custom headers (they're a server feature)
  ...(!isTauriBuild && {
    async headers() {
      return [
        {
          // CORS headers for API routes — allows Tauri webview and localhost origins
          source: "/api/:path*",
          headers: [
            { key: "Access-Control-Allow-Origin", value: "*" },
            { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
            { key: "Access-Control-Allow-Headers", value: "Content-Type, x-api-key, Authorization" },
          ],
        },
      ];
    },
  }),
};

export default nextConfig;
