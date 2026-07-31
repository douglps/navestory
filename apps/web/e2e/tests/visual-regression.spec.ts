// @spec PLANO-MIGRACAO-SHOWCASE-INFRA Rodada 5
import { test, expect } from "../fixtures/base";
import { DashboardPage } from "../pages/dashboard.page";

/**
 * Visual regression leve das páginas reais de maior tráfego (não do showcase, que não é
 * produto). Reaproveita a suíte E2E já configurada (`SPEC-20260716-003`) em vez de ferramenta
 * dedicada (Chromatic/Percy) — mantém o escopo leve.
 *
 * `next-themes` (`defaultTheme="system"`) resolve o tema pela media query
 * `prefers-color-scheme` na ausência de preferência salva em `localStorage`; `colorScheme` do
 * contexto do Playwright controla exatamente essa media query, então basta emulá-la antes de
 * navegar — sem precisar clicar no `ThemeToggle`.
 *
 * Baseline: primeira execução em CI/local com `--update-snapshots` gera os PNGs de referência
 * em `visual-regression.spec.ts-snapshots/`, versionados junto do teste (ver
 * `specs/qa/SPEC-20260716-003-e2e-playwright.md` para o processo de atualização intencional).
 */

const PAGES: { name: string; path: string; waitFor: (page: import("@playwright/test").Page) => Promise<void> }[] = [
  {
    name: "dashboard",
    path: "/dashboard",
    waitFor: async (page) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.waitForLoad();
    },
  },
  {
    name: "expenses",
    path: "/expenses",
    waitFor: async (page) => {
      await page.locator("header").waitFor({ state: "visible", timeout: 10_000 });
    },
  },
  {
    name: "fines",
    path: "/fines",
    waitFor: async (page) => {
      await page.locator("header").waitFor({ state: "visible", timeout: 10_000 });
    },
  },
];

for (const { name, path, waitFor } of PAGES) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(
      `visual: ${name} (${colorScheme})`,
      async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(path);
        await waitFor(page);
        // Tolerância pequena (ratio) absorve antialiasing/font-rendering entre runs sem
        // mascarar regressão visual real.
        await expect(page).toHaveScreenshot(`${name}-${colorScheme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        });
      },
    );
  }
}
