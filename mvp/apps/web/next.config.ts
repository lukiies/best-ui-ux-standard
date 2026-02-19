import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/shared"],
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
};

export default nextConfig;
