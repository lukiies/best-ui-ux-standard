const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Fix duplicate React instances in pnpm monorepo.
// Web app uses React 19.2.3 (hoisted to mvp/node_modules/react),
// mobile app uses React 19.1.0 (nested at apps/mobile/node_modules/react).
// Without this fix, deps like @react-navigation resolve their own nested
// React copies → "Invalid hook call" from multiple React instances.
const mobileNodeModules = path.resolve(__dirname, "node_modules");
const monorepoNodeModules = path.resolve(__dirname, "..", "..", "node_modules");

// Redirect react/react-dom to mobile app's copy (19.1.0).
// react-native stays at monorepo root (only one copy exists).
config.resolver.extraNodeModules = {
  react: path.resolve(mobileNodeModules, "react"),
  "react-dom": path.resolve(mobileNodeModules, "react-dom"),
  "react-native": path.resolve(monorepoNodeModules, "react-native"),
};

// Intercept react resolution to prevent nested duplicates
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only intercept bare "react" and "react-dom" specifiers
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    const subpath = moduleName === "react" ? "" : moduleName.slice("react/".length);
    const target = subpath
      ? path.resolve(mobileNodeModules, "react", subpath)
      : path.resolve(mobileNodeModules, "react");
    return context.resolveRequest(
      { ...context, resolveRequest: undefined },
      target,
      platform
    );
  }

  if (moduleName === "react-dom" || moduleName.startsWith("react-dom/")) {
    const subpath = moduleName === "react-dom" ? "" : moduleName.slice("react-dom/".length);
    const target = subpath
      ? path.resolve(mobileNodeModules, "react-dom", subpath)
      : path.resolve(mobileNodeModules, "react-dom");
    return context.resolveRequest(
      { ...context, resolveRequest: undefined },
      target,
      platform
    );
  }

  // Everything else: default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
