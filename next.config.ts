import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack(config) {
    // Alias next-auth/react and next-auth → Supabase-backed compat shim
    config.resolve.alias = {
      ...config.resolve.alias,
      "next-auth/react": path.resolve("./src/lib/next-auth-compat.tsx"),
      "next-auth": path.resolve("./src/lib/next-auth-compat.tsx"),
    };
    return config;
  },
  // ── Bundler ──────────────────────────────────────────────────────────────
  // Turbopack is the default in Next.js 16 but explicitly opting in here
  // ensures it's used for both dev and production builds.

  // ── React Compiler ───────────────────────────────────────────────────────
  // Stable in Next.js 16 — automatically memoizes client components,
  // eliminating the need for manual useMemo/useCallback.
  reactCompiler: true,

  // ── Cache Components (Next.js 16 stable caching model) ───────────────────
  // Enables 'use cache', cacheLife, and cacheTag directives.
  // Replaces unstable_cache throughout the app.
  // cacheComponents: true,

  // ── External packages (server-only, skip bundling) ───────────────────────
  serverExternalPackages: ["@prisma/client", "better-sqlite3"],

  // ── Image optimization ───────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    // Use AVIF first (40% smaller than WebP), fall back to WebP
    formats: ["image/avif", "image/webp"],
  },

  // ── Response optimization ────────────────────────────────────────────────
  compress: true,
  generateEtags: true,

  // ── Turbopack file-system cache (faster cold starts) ─────────────────────
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
