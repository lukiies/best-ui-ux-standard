/**
 * Build script for Tauri desktop frontend.
 *
 * Static export (output: "export") does not support API route handlers
 * that use dynamic methods (POST, request.json, etc.). This script
 * temporarily moves the API directory out of the way, runs the Next.js
 * export build, then restores it so that web builds remain unaffected.
 *
 * Run from: mvp/apps/desktop/src-tauri/ (Tauri beforeBuildCommand cwd)
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const webDir = path.resolve(__dirname, "..", "apps", "web");
const apiDir = path.join(webDir, "src", "app", "api");
const apiBackup = path.join(webDir, "src", "app", "_api_desktop_exclude");

function main() {
  const hadApi = fs.existsSync(apiDir);

  try {
    // Temporarily hide API routes (incompatible with output: "export")
    if (hadApi) {
      console.log("[desktop-build] Temporarily excluding API routes for static export...");
      fs.renameSync(apiDir, apiBackup);
    }

    // Clean .next cache — it may contain type references to API routes
    const nextCacheDir = path.join(webDir, ".next");
    if (fs.existsSync(nextCacheDir)) {
      console.log("[desktop-build] Cleaning .next cache...");
      fs.rmSync(nextCacheDir, { recursive: true, force: true });
    }

    // Build Next.js with static export — TAURI_ENV_PLATFORM is already set by Tauri
    console.log("[desktop-build] Building Next.js static export...");
    execSync("npx next build", {
      cwd: webDir,
      stdio: "inherit",
      env: {
        ...process.env,
        TAURI_ENV_PLATFORM: process.env.TAURI_ENV_PLATFORM || "windows",
      },
    });

    console.log("[desktop-build] Frontend build complete.");
  } finally {
    // Always restore API routes
    if (hadApi && fs.existsSync(apiBackup)) {
      fs.renameSync(apiBackup, apiDir);
      console.log("[desktop-build] API routes restored.");
    }
  }
}

main();
