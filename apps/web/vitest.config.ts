import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      exclude: [
        "src/app/layout.tsx",
        "src/app/page.tsx",
        "next-env.d.ts",
        "**/*.spec.tsx",
        "**/*.config.*",
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
