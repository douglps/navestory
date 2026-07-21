// @spec SPEC-20260716-003 RF-E2E-01, RF-E2E-02, RF-E2E-03
import type { Page, Locator } from "@playwright/test";

/**
 * Page Object para a tela principal (`/dashboard`) e o app shell autenticado.
 *
 * Encapsula seletores do layout autenticado (header, sidebar, botão de logout),
 * isolando os testes de detalhes de implementação do DOM.
 *
 * @spec SPEC-20260716-003 RF-E2E-02, RF-E2E-03
 * @spec SPEC-20260531-001 RF-DC-01
 */
export class DashboardPage {
  /** Header fixo do app shell — presente em todas as rotas autenticadas. */
  readonly header: Locator;

  /** Botão "Sair" no sidebar — aciona logout. */
  readonly logoutButton: Locator;

  /** Sidebar de navegação. */
  readonly sidebar: Locator;

  constructor(private readonly page: Page) {
    this.header = page.locator("header");
    // O sidebar exibe "Sair" (expandido) ou "⏻" (recolhido) — usamos regex para cobrir ambos
    this.logoutButton = page.getByRole("button", { name: /sair|⏻/i });
    this.sidebar = page.locator("nav");
  }

  /** Navega diretamente para /dashboard. */
  async goto(): Promise<void> {
    await this.page.goto("/dashboard");
  }

  /** Verifica que o dashboard está carregado (header + sidebar visíveis). */
  async waitForLoad(): Promise<void> {
    await this.header.waitFor({ state: "visible", timeout: 10_000 });
    await this.sidebar.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Realiza logout clicando no botão "Sair". */
  async logout(): Promise<void> {
    await this.logoutButton.click();
    // logout() redireciona via window.location.href — aguarda navegação
    await this.page.waitForURL("**/login", { timeout: 10_000 });
  }

  /** Verifica que a URL atual é /dashboard. */
  async expectDashboardUrl(): Promise<void> {
    await this.page.waitForURL("**/dashboard", { timeout: 10_000 });
  }
}
