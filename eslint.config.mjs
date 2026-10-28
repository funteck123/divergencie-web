import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not source: generated release builds, ops scratch scripts and local backups (TKT-0385: they added about 730 findings to every lint run).
    "builds/**",
    "data/**",
    "backups/**",
  ]),
]);

export default eslintConfig;
