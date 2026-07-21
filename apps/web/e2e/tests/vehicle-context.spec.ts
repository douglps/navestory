// @spec SPEC-20260716-003 RF-E2E-06, RF-E2E-07
// @spec SPEC-20260603-001 RF-07, RF-08, RF-09, RF-10, R-CTX-07
// @spec RULES.md R-CTX-06, R-CTX-07
import { test, expect } from "../fixtures/base";
import { DashboardPage } from "../pages/dashboard.page";
import { VehicleContextChipPage } from "../pages/vehicle-context-chip.page";
import { ExpenseFormPage } from "../pages/expense-form.page";

/**
 * Suite de testes E2E de troca de contexto de veículo via chip.
 *
 * Valida o fluxo completo de seleção de veículo no browser:
 * - Abertura do Dialog/Sheet (componente DOM real, não mockado)
 * - Atualização do chip após seleção
 * - Propagação do contexto para o formulário de despesa
 *
 * Pré-condição: o usuário de teste deve ter pelo menos 2 veículos cadastrados
 * para que a troca de contexto faça sentido.
 *
 * @spec SPEC-20260716-003 RF-E2E-06, RF-E2E-07
 * @spec SPEC-20260603-001 RF-07, R-CTX-07
 */

/** Placa/nome do primeiro veículo de teste. */
const VEHICLE_A_PLATE = process.env.E2E_VEHICLE_A_PLATE ?? "";
/** Placa/nome do segundo veículo de teste (para troca de contexto). */
const VEHICLE_B_PLATE = process.env.E2E_VEHICLE_B_PLATE ?? "";

test.describe("Troca de contexto de veículo", () => {
  /**
   * RF-E2E-06 / REG-E2E-01: chip de contexto atualiza após seleção no Dialog.
   *
   * Fluxo:
   * 1. Navega para /dashboard (sessão autenticada)
   * 2. Clica no VehicleContextChip → verifica abertura do Dialog/Sheet
   * 3. Seleciona veículo B via busca
   * 4. Verifica que o chip atualiza para exibir o nome/placa do veículo B
   * 5. Navega para outra rota e verifica que o contexto persiste
   *
   * @spec SPEC-20260716-003 RF-E2E-06
   * @spec SPEC-20260603-001 RF-07, R-CTX-07
   */
  test(
    "REG-E2E-01: chip de contexto atualiza após seleção no dialog (R-CTX-07)",
    async ({ page }) => {
      if (!VEHICLE_B_PLATE) {
        test.skip(
          true,
          "E2E_VEHICLE_B_PLATE não configurado — configure 2 veículos para o usuário de teste.",
        );
        return;
      }

      const dashboardPage = new DashboardPage(page);
      const contextChip = new VehicleContextChipPage(page);

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Abre o Dialog de seleção de veículo
      await contextChip.openDialog();

      // Verifica que o campo de busca está visível (Dialog abriu)
      await expect(contextChip.searchInput).toBeVisible();

      // Seleciona veículo B pelo texto (placa ou nome)
      await contextChip.selectVehicle(VEHICLE_B_PLATE);

      // Verifica que o Dialog fechou após seleção
      expect(await contextChip.isDialogClosed()).toBe(true);

      // Verifica que o chip atualiza para refletir veículo B
      await contextChip.waitForChipUpdate(VEHICLE_B_PLATE);
      const chipAriaLabel = await contextChip.getChipAriaLabel();
      expect(chipAriaLabel).toMatch(/em foco/i);
      expect(chipAriaLabel).toContain(VEHICLE_B_PLATE);

      // Persistência do contexto ao navegar para outra rota
      await page.goto("/expenses");
      await page.waitForURL("**/expenses");

      // Chip ainda deve exibir veículo B após navegação
      const chipLabelAfterNav = await contextChip.getChipAriaLabel();
      expect(chipLabelAfterNav).toContain(VEHICLE_B_PLATE);
    },
  );

  /**
   * RF-E2E-07: propagação do contexto para o campo vehicle_id no formulário.
   *
   * Fluxo:
   * 1. Seleciona veículo A no chip (contexto inicial)
   * 2. Abre /expenses/new → verifica que vehicle_id está herdado do contexto (veículo A)
   * 3. Enquanto o formulário está aberto, troca para veículo B via chip
   * 4. Aceita o aviso de atualização do campo
   * 5. Verifica que vehicle_id agora reflete veículo B
   *
   * @spec SPEC-20260716-003 RF-E2E-07
   * @spec SPEC-20260603-001 R-CTX-06, R-CTX-07
   */
  test(
    "REG-E2E-02: campo vehicle_id do formulário atualiza ao trocar contexto com chip (R-CTX-06, R-CTX-07)",
    async ({ page }) => {
      if (!VEHICLE_A_PLATE || !VEHICLE_B_PLATE) {
        test.skip(
          true,
          "E2E_VEHICLE_A_PLATE e E2E_VEHICLE_B_PLATE não configurados — necessários para RF-E2E-07.",
        );
        return;
      }

      const contextChip = new VehicleContextChipPage(page);
      const expenseForm = new ExpenseFormPage(page);
      const dashboardPage = new DashboardPage(page);

      // Passo 1: seleciona veículo A no chip antes de abrir o formulário
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      await contextChip.openDialog();
      await contextChip.selectVehicle(VEHICLE_A_PLATE);
      await contextChip.waitForChipUpdate(VEHICLE_A_PLATE);

      // Passo 2: abre /expenses/new — vehicle_id deve estar herdado do contexto (veículo A)
      await expenseForm.goto();

      // Campo herdado do contexto — label âmbar "↩ Herdado do contexto em foco" visível
      expect(await expenseForm.isVehicleInherited()).toBe(true);

      const vehicleAId = await expenseForm.getSelectedVehicleId();
      expect(vehicleAId).toBeTruthy();

      // Passo 3: enquanto o formulário está aberto, troca para veículo B via chip
      await contextChip.openDialog();
      await contextChip.selectVehicle(VEHICLE_B_PLATE);
      await contextChip.waitForChipUpdate(VEHICLE_B_PLATE);

      // Passo 4: aviso de mudança de contexto aparece no formulário (contextChangeNotice)
      // O formulário exibe: "[texto do aviso]" + botões "Atualizar campo" e "×"
      const applyContextChangeButton = page.getByRole("button", {
        name: "Atualizar campo",
      });
      await applyContextChangeButton.waitFor({ state: "visible", timeout: 5_000 });
      await applyContextChangeButton.click();

      // Passo 5: vehicle_id agora deve refletir veículo B (valor diferente de vehicleAId)
      const vehicleBId = await expenseForm.getSelectedVehicleId();
      expect(vehicleBId).toBeTruthy();
      expect(vehicleBId).not.toEqual(vehicleAId);
    },
  );
});
