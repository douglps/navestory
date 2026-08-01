// @spec SPEC-20260716-003 RF-E2E-01, RF-E2E-02, RF-E2E-03
import type { Page, Locator } from "@playwright/test";

/**
 * Page Object para a tela de login (`/login`).
 *
 * Encapsula todos os seletores e interações da tela de autenticação,
 * isolando os arquivos de teste de mudanças no DOM.
 *
 * @spec SPEC-20260716-003 RF-E2E-01, RF-E2E-02, RF-E2E-03
 * @spec SPEC-20260524-001 STORY-01
 */
export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;

  constructor(private readonly page: Page) {
    // Seletores semânticos baseados em label/role — estáveis a mudanças de CSS/classe
    this.emailInput = page.getByLabel("E-mail");
    // exact: true evita colisão com o botão "Mostrar senha"/"Ocultar senha" do PasswordInput,
    // cujo aria-label contém "senha" como substring
    this.passwordInput = page.getByLabel("Senha", { exact: true });
    this.submitButton = page.getByRole("button", { name: "Entrar" });
    this.errorAlert = page.getByRole("alert");
  }

  /** navega para a tela de login. */
  async goto(): Promise<void> {
    // domcontentloaded em vez do "load" padrão — ver nota em dashboard.page.ts
    await this.page.goto("/login", { waitUntil: "domcontentloaded" });
    await this.emailInput.waitFor({ state: "visible" });
  }

  /**
   * Realiza o login com as credenciais fornecidas e aguarda o redirect.
   * Para testes que validam o próprio login (RF-E2E-02), use `submitAndWait` separadamente.
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /** Aguarda redirect para /dashboard após login bem-sucedido. */
  async waitForDashboard(): Promise<void> {
    await this.page.waitForURL("**/dashboard", { timeout: 15_000 });
  }

  /** Verifica que a URL atual é a tela de login. */
  async expectLoginPage(): Promise<void> {
    await this.page.waitForURL("**/login**", { timeout: 10_000 });
  }
}
