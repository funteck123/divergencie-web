import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // v7 lives nested inside the divergencie repo, which has its own
  // package-lock.json at the root — without this, Turbopack infers the
  // wrong workspace root from the outer lockfile and resolves node_modules
  // incorrectly. Leave outputFileTracingRoot to Vercel's own monorepo
  // detection (setting it explicitly to this directory breaks Vercel's
  // deploy-packaging step: "ENOENT .next/package.json") — the mismatch
  // warning this produces locally is harmless, build output is unaffected.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  // Lets the dev server accept requests (including the HMR websocket) from
  // the ngrok tunnel used for testing on other devices — otherwise Next.js
  // blocks cross-origin dev resources by default and pages served through
  // that origin can misbehave (stuck on stale/broken client bundles).
  allowedDevOrigins: ["helping-ibex-nominally.ngrok-free.app"],
  // Marketing pages (ported from v6) hotlink a couple of unsplash images.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  // canvas (used for PDF/schedule-image generation) is a native addon —
  // keep it external to the server bundle rather than letting webpack try
  // to bundle its .node binary.
  serverExternalPackages: ["canvas"],
};

export default nextConfig;
