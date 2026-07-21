// @spec SPEC-20260716-003 RF-E2E-04, RF-E2E-05, RF-E2E-07
// @spec SPEC-20260601-001 R1 (odometer_warning)
// @spec SPEC-20260601-002 R2 (duplicate_warning)
import type { Page, Locator } from "@playwright/test";

/**
 * Page Object para o formulário de criação de despesa (`/expenses/new`).
 *
 * Encapsula seletores e interações do formulário de despesa, incluindo:
 * - Seleção de veículo
 * - Seleção de categoria
 * - Preenchimento de valor (CurrencyInput ATM-style)
 * - Preenchimento de odômetro (categoria fuel)
 * - Submissão e leitura de alertas
 *
 * @spec SPEC-20260716-003 RF-E2E-04, RF-E2E-05, RF-E2E-07
 */
export class ExpenseFormPage {
  readonly vehicleSelect: Locator;
  readonly categorySelect: Locator;
  readonly odometerInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  /** Alert de erro de campo ou aviso de odômetro/duplicata */
  readonly alertMessage: Locator;
  /** Aviso de contexto de veículo herdado */
  readonly contextChangeNotice: Locator;
  /** Link para herdado do contexto */
  readonly inheritedHint: Locator;

  constructor(private readonly page: Page) {
    this.vehicleSelect = page.locator("#vehicle_id");
    this.categorySelect = page.locator("#category");
    this.odometerInput = page.locator("#odometer_km");
    this.submitButton = page.getByRole("button", { name: /registrar/i });
    this.cancelButton = page.getByRole("button", { name: /cancelar/i });
    this.alertMessage = page.getByRole("alert");
    this.contextChangeNotice = page.getByRole("status");
    // Campo de veículo com borda âmbar quando herdado do contexto
    this.inheritedHint = page.getByText(/herdado do contexto/i);
  }

  /** Navega para /expenses/new. */
  async goto(): Promise<void> {
    await this.page.goto("/expenses/new");
    await this.vehicleSelect.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Seleciona um veículo pelo texto visível na option (plate ou label). */
  async selectVehicle(vehicleLabel: string): Promise<void> {
    await this.vehicleSelect.selectOption({ label: vehicleLabel });
  }

  /** Seleciona um veículo pelo valor do option (vehicle_id). */
  async selectVehicleById(vehicleId: string): Promise<void> {
    await this.vehicleSelect.selectOption({ value: vehicleId });
  }

  /** Seleciona a categoria pelo value da option. */
  async selectCategory(categoryValue: string): Promise<void> {
    await this.categorySelect.selectOption({ value: categoryValue });
  }

  /**
   * Preenche o campo de valor monetário (CurrencyInput ATM-style).
   * O componente formata centavos como reais, então "150" → R$ 1,50;
   * para R$ 150,00, passe "15000".
   */
  async fillAmount(centavos: string): Promise<void> {
    // O CurrencyInput tem id="amount" — acessa pelo label
    const amountInput = this.page.getByLabel(/valor.*r\$/i);
    await amountInput.fill(centavos);
  }

  /**
   * Preenche o odômetro em km.
   * Campo visível somente quando categoria é "fuel".
   */
  async fillOdometer(km: string): Promise<void> {
    await this.odometerInput.waitFor({ state: "visible", timeout: 5_000 });
    await this.odometerInput.fill(km);
  }

  /** Submete o formulário e aguarda a resposta. */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Aguarda exibição de mensagem de alerta (fieldError ou mutation.isError).
   * Retorna o texto do primeiro elemento `role="alert"` visível.
   */
  async waitForAlert(timeout = 8_000): Promise<string> {
    await this.alertMessage.first().waitFor({ state: "visible", timeout });
    return (await this.alertMessage.first().textContent()) ?? "";
  }

  /**
   * Verifica se o campo de veículo está com a indicação de "herdado do contexto".
   * Relevante para RF-E2E-07 (R-CTX-06).
   */
  async isVehicleInherited(): Promise<boolean> {
    return this.inheritedHint.isVisible();
  }

  /**
   * Lê o valor atualmente selecionado no campo veículo.
   */
  async getSelectedVehicleId(): Promise<string> {
    return this.vehicleSelect.inputValue();
  }
}
