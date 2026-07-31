// @spec SPEC-20260716-003 RF-E2E-03
// @spec SPEC-20260524-001 STORY-03
// @spec RULES.md S1
import { test, expect } from "../fixtures/base";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

/**
 * RF-E2E-03: logout → redirect para /login e rota privada não acessível.
 *
 * Isolado em arquivo/projeto próprio (ver `playwright.config.ts`, projeto
 * "chromium-logout" com `dependencies: ["chromium"]"): `AuthService.logout()` chama
 * `supabaseAdmin.auth.admin.signOut(accessToken, "global")` — escopo "global" revoga
 * a sessão em TODOS os dispositivos/tokens do usuário e-tester, não só a sessão do
 * teste. Isso invalida o storageState do globalSetup (`e2e/auth-state.json`),
 * compartilhado por todo o resto da suíte. Um contexto isolado (browser.newContext)
 * não é suficiente para evitar o problema, pois a revogação acontece no lado do
 * Supabase por usuário, não por contexto/cookie local. Rodar este teste como
 * dependência posterior garante que ele só executa depois que os demais projetos já
 * tenham consumido o storageState compartilhado.
 *
 * @spec SPEC-20260716-003 RF-E2E-03
 */
test.describe("Autenticação — logout (isolado)", () => {
  test(
    "CT-006: logout redireciona para /login e bloqueia acesso a /dashboard (S1)",
    async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined });
      const page = await context.newPage();

      const email = process.env.E2E_USER_EMAIL;
      const password = process.env.E2E_USER_PASSWORD;

      if (!email || !password) {
        throw new Error(
          "E2E_USER_EMAIL e E2E_USER_PASSWORD são obrigatórias para RF-E2E-03",
        );
      }

      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      try {
        // Login dedicado — sessão própria, isolada do storageState global
        await loginPage.goto();
        await loginPage.login(email, password);
        await loginPage.waitForDashboard();
        await dashboardPage.waitForLoad();

        // Realiza logout
        await dashboardPage.logout();

        // Deve estar na tela de login
        await loginPage.expectLoginPage();
        await expect(page).toHaveURL(/\/login/);

        // Tenta acessar /dashboard sem sessão — deve ser redirecionado novamente
        // domcontentloaded em vez do "load" padrão — ver nota em dashboard.page.ts
        await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
      } finally {
        await context.close();
      }
    },
  );
});
