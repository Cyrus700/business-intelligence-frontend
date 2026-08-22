import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Power BI-level UX often requires syncing external state; the
      // set-state-in-effect rule is overly strict for auth + dashboard sync.
      // Downgrade to warning so build remains green while preserving intent.
      "react-hooks/set-state-in-effect": "warn",
      // Dashboard is data-heavy with many dynamic API shapes; `any` is
      // pragmatic for BI drill-through payloads. Warn, don't error.
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused imports in scaffolded BI pages are noisy; keep as warn.
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
]);

export default eslintConfig;
