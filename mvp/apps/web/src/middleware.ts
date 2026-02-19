import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Allow Tauri webview and localhost origins
  const origin = request.headers.get("origin");
  if (origin && (origin.startsWith("tauri://") || origin.startsWith("http://localhost"))) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key, Authorization");
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
