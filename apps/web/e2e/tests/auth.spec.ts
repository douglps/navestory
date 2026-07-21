// @spec SPEC-20260716-003 RF-E2E-01, RF-E2E-02, RF-E2E-03
// @spec SPEC-20260524-001 STORY-01, STORY-02, STORY-03
// @spec RULES.md S1
import { test, expect } from "../fixtures/base";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

/**
 * Suite de testes E2E de autenticação.
 *
 * Valida os fluxos críticos de auth no browser real (redirect SSR via middleware,
 * cookies httpOnly, logout com limpeza de sessão). Complementar — e não substituto —
 * aos testes de integração em `apps/api/test/integration/auth.int-spec.ts`.
 *
 * S1: JWT obrigatório para rotas privadas.
 * @spec SPEC-20260716-003 RF-E2E-01, RF-E2E-02, RF-E2E-03
 */
test.describe("Autenticação", () => {
  /**
   * RF-E2E-01 / CT-006: acesso sem sessão deve redirecionar para /login.
   *
   * Valida que o middleware SSR (`apps/web/middleware.ts`) rejeita a requisição
   * quando não há `nave_access_token` válido nos cookies e faz redirect para /login.
   * Não pode ser coberto por teste unitário (requer browser + middleware SSR).
   *
   * @spec SPEC-20260716-003 RF-E2E-01
   */
  test(
    "CT-006: redirect para /login ao acessar /dashboard sem sessão (S1)",
    async ({ browser }) => {
      // Contexto SEM storageState — simula usuário não autenticado
      const context = await browser.newContext({ storageState: undefined });
      const page = await context.newPage();

      try {
        await page.goto("/dashboard");
        // Middleware SSR redireciona para /login?redirect=/dashboard
        await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
      } finally {
        await context.close();
      }
    },
  );

  /**
   * RF-E2E-02: login com credenciais válidas → dashboard.
   *
   * Valida o fluxo completo de autenticação no browser: formulário → API →
   * cookie httpOnly → middleware SSR libera acesso → dashboard renderizado.
   *
   * @spec SPEC-20260716-003 RF-E2E-02
   */
  test(
    "CT-006: login com credenciais válidas redireciona para /dashboard (S1)",
    async ({ browser }) => {
      // Contexto SEM storageState — testa o próprio fluxo de login
      const context = await browser.newContext({ storageState: undefined });
      const page = await context.newPage();

      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      const email = process.env.E2E_USER_EMAIL;
      const password = process.env.E2E_USER_PASSWORD;

      if (!email || !password) {
        throw new Error(
          "E2E_USER_EMAIL e E2E_USER_PASSWORD são obrigatórias para RF-E2E-02",
        );
      }

      try {
        await loginPage.goto();
        await loginPage.login(email, password);
        await loginPage.waitForDashboard();

        // Verifica que o app shell (header + sidebar) foi renderizado
        await dashboardPage.waitForLoad();

        await expect(page).toHaveURL(/\/dashboard/);
        await expect(dashboardPage.header).toBeVisible();
        await expect(dashboardPage.sidebar).toBeVisible();
      } finally {
        await context.close();
      }
    },
  );

  /**
   * RF-E2E-03: logout → redirect para /login e rota privada não acessível.
   *
   * Valida que o botão "Sair" chama `logout()` corretamente:
   * - Chama POST /auth/logout no backend
   * - Limpa o contexto global do store + sessionStorage
   * - Redireciona para /login via window.location.href
   * - Após logout, /dashboard não é mais acessível sem novo login
   *
   * Usa sessão autenticada do storageState (globalSetup).
   *
   * @spec SPEC-20260716-003 RF-E2E-03
   */
  test(
    "CT-006: logout redireciona para /login e bloqueia acesso a /dashboard (S1)",
    async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      const loginPage = new LoginPage(page);

      // Sessão autenticada via storageState do globalSetup
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Realiza logout
      await dashboardPage.logout();

      // Deve estar na tela de login
      await loginPage.expectLoginPage();
      await expect(page).toHaveURL(/\/login/);

      // Tenta acessar /dashboard sem sessão — deve ser redirecionado novamente
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    },
  );
});
