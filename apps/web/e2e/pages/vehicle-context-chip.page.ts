// @spec SPEC-20260716-003 RF-E2E-06, RF-E2E-07
// @spec SPEC-20260603-001 RF-01, RF-07, R-CTX-07
import type { Page, Locator } from "@playwright/test";

/**
 * Page Object para o componente `VehicleContextChip` e o Dialog/Sheet de seleção de veículo.
 *
 * O chip aparece no header em todas as rotas autenticadas. Abre um Dialog (desktop ≥ 768px)
 * ou Sheet (mobile < 768px) ao ser clicado.
 *
 * Seletores baseados em aria-label dinâmico definido por `getModeAriaLabel()` em
 * `use-vehicle-context.ts`. Valores conhecidos:
 *   - Sem contexto:  "Sem contexto — clique para selecionar veículo"
 *   - Veículo em foco: "Em foco: {plate} — {make} {model}"
 *   - Grupo em foco:   "Em foco: grupo {name} — {count} veículos"
 *
 * @spec SPEC-20260716-003 RF-E2E-06, RF-E2E-07
 * @spec SPEC-20260603-001 RF-01, RF-05, RF-07
 */
export class VehicleContextChipPage {
  /** Campo de busca dentro do Dialog/Sheet de seleção */
  readonly searchInput: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByLabel("Buscar veículo ou grupo");
  }

  /**
   * Localiza o chip de contexto no header.
   * Usa regex para cobrir todos os estados (sem contexto e em foco).
   */
  private getChip(): Locator {
    return this.page.getByRole("button", {
      name: /selecionar veículo|em foco|seleção personalizada|filtro de frota/i,
    });
  }

  /** Abre o Dialog/Sheet clicando no chip. */
  async openDialog(): Promise<void> {
    const chip = this.getChip();
    await chip.waitFor({ state: "visible", timeout: 8_000 });
    await chip.click();
    // Aguarda o campo de busca aparecer (indica que o Dialog/Sheet abriu)
    await this.searchInput.waitFor({ state: "visible", timeout: 5_000 });
  }

  /**
   * Seleciona um veículo pelo texto visível no Dialog/Sheet.
   * O texto exibido é: "{emoji} {plate} · {model|make}"
   * Usa matching parcial (placa ou nome) para flexibilidade.
   */
  async selectVehicle(vehiclePlateOrName: string): Promise<void> {
    await this.searchInput.fill(vehiclePlateOrName);

    const vehicleButton = this.page
      .getByRole("button")
      .filter({ hasText: vehiclePlateOrName });
    await vehicleButton.first().waitFor({ state: "visible", timeout: 5_000 });
    await vehicleButton.first().click();
    // O click fecha o Dialog/Sheet via onClose()
    await this.searchInput.waitFor({ state: "hidden", timeout: 5_000 });
  }

  /**
   * Lê o aria-label atual do chip (estado do contexto).
   * Permite verificar qual veículo/modo está ativo após a seleção.
   */
  async getChipAriaLabel(): Promise<string> {
    const chip = this.getChip();
    await chip.waitFor({ state: "visible", timeout: 8_000 });
    return chip.getAttribute("aria-label").then((value) => value ?? "");
  }

  /**
   * Lê o texto visível exibido no chip (label truncado).
   */
  async getChipLabel(): Promise<string> {
    const chip = this.getChip();
    await chip.waitFor({ state: "visible", timeout: 8_000 });
    // O span interno com o label (exclui o ícone de modo e o botão ×)
    const labelSpan = chip.locator("span.truncate");
    return labelSpan.textContent().then((text) => (text ?? "").trim());
  }

  /**
   * Verifica se o Dialog/Sheet está fechado (searchInput não visível).
   */
  async isDialogClosed(): Promise<boolean> {
    return !(await this.searchInput.isVisible());
  }

  /**
   * Aguarda o chip atualizar para refletir o novo contexto após seleção.
   * Passa como argumento parte do texto esperado no aria-label.
   */
  async waitForChipUpdate(expectedText: string, timeout = 8_000): Promise<void> {
    const chip = this.getChip();
    await chip.waitFor({ state: "visible", timeout });
    await this.page.waitForFunction(
      ({ expectedText }: { expectedText: string }) => {
        const button = document.querySelector('[role="button"][aria-label*="Em foco"]') as HTMLElement | null;
        return button?.getAttribute("aria-label")?.includes(expectedText) ?? false;
      },
      { expectedText },
      { timeout },
    );
  }
}
