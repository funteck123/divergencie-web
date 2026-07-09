/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Lets the dev server accept requests (including the HMR websocket) from
  // the ngrok tunnel used for testing on other devices — otherwise Next.js
  // blocks cross-origin dev resources by default and pages served through
  // that origin can misbehave (stuck on stale/broken client bundles).
  allowedDevOrigins: ["helping-ibex-nominally.ngrok-free.app"],
};

export default nextConfig;
