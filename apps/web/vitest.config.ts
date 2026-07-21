import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Exclui testes E2E do Playwright — usam @playwright/test, não Vitest
    // @spec SPEC-20260716-003 RF-CFG-05
    exclude: ["e2e/**", "**/node_modules/**"],
    coverage: {
      reporter: ["text", "lcov"],
      exclude: [
        "src/app/layout.tsx",
        "next-env.d.ts",
        "**/*.spec.tsx",
        "**/*.config.*",
        ".next/**",
        "public/**",
      ],
      thresholds: {
        lines: 88,
        statements: 88,
        functions: 88,
        branches: 88,
      },
    },
  },
});
