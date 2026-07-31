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
    // Locator específico via role+aria-label: o footer do shell também renderiza <nav>
    // próprios (links de rodapé), então `page.locator("nav")` deixou de ser único
    this.sidebar = page.getByRole("dialog", { name: "Menu de navegação" });
  }

  /** Navega diretamente para /dashboard. */
  async goto(): Promise<void> {
    // domcontentloaded em vez do "load" padrão: o dev server do Next.js mantém conexões
    // (HMR, streaming dos gráficos) que impedem o evento "load" de disparar dentro do
    // timeout de 30s, mesmo com o conteúdo já renderizado — waitForLoad() abaixo já
    // espera explicitamente pelos elementos concretos do shell autenticado.
    await this.page.goto("/dashboard", { waitUntil: "domcontentloaded" });
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
