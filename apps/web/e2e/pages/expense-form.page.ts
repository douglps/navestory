// @spec SPEC-20260716-003 RF-E2E-04, RF-E2E-05, RF-E2E-07
// @spec SPEC-20260601-001 R1 (odometer_warning)
// @spec SPEC-20260601-002 R2 (duplicate_warning)
import { expect, type Page, type Locator } from "@playwright/test";

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

  /**
   * Traduz o slug de categoria (`category.value` no backend) para o label exibido no
   * Combobox — a busca do Cmdk filtra pelo texto visível, não pelo slug. Mapeia só as
   * categorias usadas pela suíte E2E; ver `expense_categories` para o catálogo completo.
   */
  private static readonly CATEGORY_LABELS: Record<string, string> = {
    fuel: "Combustível",
    toll: "Pedágio",
  };

  constructor(private readonly page: Page) {
    // O formulário migrou de <select> nativo para o Combobox de `@nave/ui` (Radix Popover +
    // cmdk) — o trigger é um <button role="combobox"> identificado pelo aria-label, não mais
    // por id (`#vehicle_id`/`#category` não existem mais no DOM).
    this.vehicleSelect = page.getByRole("combobox", { name: "Veículo *" });
    this.categorySelect = page.getByRole("combobox", { name: "Categoria *" });
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
    // domcontentloaded em vez do "load" padrão — ver nota em dashboard.page.ts
    await this.page.goto("/expenses/new", { waitUntil: "domcontentloaded" });
    await this.vehicleSelect.waitFor({ state: "visible", timeout: 10_000 });
  }

  /**
   * Abre um Combobox pelo trigger e clica na option cujo texto contém `optionText`.
   * Compartilhado por `selectVehicle`/`selectCategory` — ambos os campos usam o mesmo
   * componente `<Combobox>` (Radix Popover + cmdk, `role="option"` em cada item).
   */
  private async selectFromCombobox(trigger: Locator, optionText: string): Promise<void> {
    await trigger.waitFor({ state: "visible", timeout: 10_000 });
    await trigger.click();
    const option = this.page.getByRole("option").filter({ hasText: optionText });
    await option.first().waitFor({ state: "visible", timeout: 5_000 });
    await option.first().click();
  }

  /** Seleciona um veículo pelo texto visível na option (plate ou label). */
  async selectVehicle(vehicleLabel: string): Promise<void> {
    await this.selectFromCombobox(this.vehicleSelect, vehicleLabel);
  }

  /** Seleciona a categoria pelo slug (ex: "fuel", "toll") — traduzido para o label exibido. */
  async selectCategory(categoryValue: string): Promise<void> {
    const label = ExpenseFormPage.CATEGORY_LABELS[categoryValue] ?? categoryValue;
    await this.selectFromCombobox(this.categorySelect, label);
  }

  /**
   * Preenche o campo de valor monetário (CurrencyInput ATM-style).
   * O componente formata centavos como reais, então "150" → R$ 1,50;
   * para R$ 150,00, passe "15000".
   *
   * O input é `readOnly` por design — só aceita dígitos via `onKeyDown` (ver
   * `packages/ui/src/components/masked-input.tsx`), então `.fill()` nunca funciona aqui
   * (Playwright recusa preencher elemento não-editável); usa `pressSequentially` para
   * disparar eventos de teclado reais, um dígito por vez.
   */
  async fillAmount(centavos: string): Promise<void> {
    // O CurrencyInput tem id="amount" — acessa pelo label
    const amountInput = this.page.getByLabel(/valor.*r\$/i);
    await amountInput.click();
    await amountInput.pressSequentially(centavos);
  }

  /**
   * Preenche o odômetro em km.
   * Campo visível somente quando categoria é "fuel".
   * Mesmo padrão `readOnly` + `onKeyDown` do CurrencyInput — ver nota em `fillAmount`.
   */
  async fillOdometer(km: string): Promise<void> {
    await this.odometerInput.waitFor({ state: "visible", timeout: 5_000 });
    await this.odometerInput.click();
    await this.odometerInput.pressSequentially(km);
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
    // Espera o texto ficar não-vazio, não só o elemento visível — o alert pode montar
    // vazio por um instante antes do React preencher a mensagem de erro (race de render).
    await expect(this.alertMessage.first()).not.toHaveText("", { timeout });
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
   * Lê o texto do veículo atualmente selecionado no Combobox (o trigger não expõe o
   * vehicle_id diretamente no DOM — apenas o label visível). Suficiente para comparar
   * identidade entre seleções (ver RF-E2E-07: veículo A vs. veículo B).
   */
  async getSelectedVehicleId(): Promise<string> {
    return (await this.vehicleSelect.textContent()) ?? "";
  }
}
