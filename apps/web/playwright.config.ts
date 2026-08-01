// @spec SPEC-20260716-003 RF-CFG-01, RF-CFG-02, RF-CFG-03, RF-CFG-04
import { defineConfig, devices } from "@playwright/test";

/**
 * Configuração do Playwright para testes E2E do navestory.
 *
 * Variáveis de ambiente necessárias:
 *   E2E_BASE_URL      — URL base do Next.js (default: http://localhost:3000)
 *   E2E_USER_EMAIL    — e-mail do usuário de teste E2E
 *   E2E_USER_PASSWORD — senha do usuário de teste E2E
 *
 * @spec SPEC-20260716-003 RF-CFG-02, RF-DATA-01
 */
export default defineConfig({
  // RF-CFG-02: pasta de testes
  testDir: "./e2e/tests",

  // RF-CFG-02: 30 s por teste
  timeout: 30_000,

  // RF-CFG-02: 1 tentativa em CI (distingue falha real de ruído de infra sem
  // mascarar flakiness — ver e2e-tester.md), 0 localmente
  retries: process.env.CI ? 1 : 0,

  // RF-CFG-02: relatório HTML em e2e/reports/
  reporter: [["html", { outputFolder: "e2e/reports", open: "never" }]],

  // Setup global: login único + salva storageState
  // RF-CFG-08
  globalSetup: "./e2e/global-setup.ts",

  use: {
    // RF-CFG-02: baseURL via variável de ambiente
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",

    // RF-CFG-08: sessão reutilizável (sobrescrita por teste que valida login/logout)
    storageState: "e2e/auth-state.json",

    // Rastreio em caso de falha para facilitar diagnóstico no CI (RF-CI-05)
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // RF-CFG-03: chromium obrigatório
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /auth-logout\.spec\.ts/,
    },
    // Isolado: auth-logout.spec.ts faz signOut com escopo "global" (revoga TODAS as
    // sessões do usuário e2e-tester, incluindo o storageState do globalSetup
    // compartilhado por todo o resto da suíte). `dependencies` garante que este
    // projeto só roda depois que "chromium" termina, evitando quebrar os demais
    // testes autenticados — ver nota em auth-logout.spec.ts.
    {
      name: "chromium-logout",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /auth-logout\.spec\.ts/,
      dependencies: ["chromium"],
    },
    // firefox e webkit opcionais — habilitados em revisão posterior (RF-CFG-03)
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
