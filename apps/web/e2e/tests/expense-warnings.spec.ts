// @spec SPEC-20260716-003 RF-E2E-04, RF-E2E-05
// @spec SPEC-20260612-001 R-ODO-01 (hard block de odômetro no fluxo web)
// @spec SPEC-20260601-002 R2 (duplicate_warning)
// @spec SPEC-20260720-002 RF-02, RF-03 (banner de duplicata na UI)
import { test, expect } from "../fixtures/base";
import { ExpenseFormPage } from "../pages/expense-form.page";

/**
 * Suite de testes E2E de avisos de negócio no formulário de despesa.
 *
 * Valida que as respostas de aviso da API (odômetro e duplicata) chegam ao usuário
 * no browser — camada E2E complementar, não substituta, dos testes unitários em
 * `apps/api/src/modules/expenses/expenses.service.spec.ts`.
 *
 * NOTA TÉCNICA — RF-E2E-04: comportamento real é hard block (R-ODO-01), não soft
 * warning (R1). RF-E2E-04 foi corrigida em SPEC-20260716-003 (changelog 2026-07-20)
 * para refletir isso — R-ODO-01 supersede R1 apenas no fluxo web via `?strict=true`.
 *
 * @spec SPEC-20260716-003 RF-E2E-04, RF-E2E-05, RF-DATA-02, RF-DATA-03
 */

/** ID do veículo de teste E2E — deve ter pelo menos um registro de odômetro prévio. */
const TEST_VEHICLE_PLATE = process.env.E2E_TEST_VEHICLE_PLATE ?? "";

test.describe("Avisos de negócio no formulário de despesa", () => {
  /**
   * RF-E2E-04 / EC-E2E-01: aviso de odômetro inválido exibido na tela.
   *
   * Fluxo: seleciona veículo de teste → categoria "fuel" → odômetro menor que o
   * último registrado → submete → verifica alerta de odômetro na tela.
   *
   * Pré-condição: o veículo de teste (`E2E_TEST_VEHICLE_PLATE`) deve ter ao menos
   * um registro de odômetro (despesa de combustível), para que a validação de sequência
   * seja ativada (RF-DATA-02).
   *
   * NOTA: O campo `odometer_km` no formulário de despesa só aparece quando a categoria
   * é "fuel". O backend retorna 400 com mensagem "Odômetro inválido..." quando o valor
   * enviado é menor que o último registrado para a mesma data ou anterior.
   *
   * @spec SPEC-20260716-003 RF-E2E-04
   * @spec SPEC-20260601-001 R1
   */
  test(
    "EC-E2E-01: aviso de odômetro exibido ao tentar registrar km abaixo do último (R-ODO-01)",
    async ({ page }) => {
      if (!TEST_VEHICLE_PLATE) {
        // RF-DATA-02: sem veículo de teste configurado, marcar como skip com aviso
        test.skip(
          true,
          "E2E_TEST_VEHICLE_PLATE não configurado — configure um veículo com odômetro registrado.",
        );
        return;
      }

      const expenseForm = new ExpenseFormPage(page);

      await expenseForm.goto();

      // Seleciona o veículo de teste pela placa (label visível no select)
      await expenseForm.selectVehicle(TEST_VEHICLE_PLATE);

      // Seleciona categoria "fuel" (exibe campo odometer_km)
      await expenseForm.selectCategory("fuel");

      // Preenche valor — R$ 100,00 (10000 centavos)
      await expenseForm.fillAmount("10000");

      // Preenche odômetro COM VALOR BAIXO para acionar o hard block:
      // 1 km — garante que será menor que qualquer odômetro já registrado
      await expenseForm.fillOdometer("1");

      await expenseForm.submit();

      // Aguarda o alerta de erro do odômetro aparecer na tela
      const alertText = await expenseForm.waitForAlert();

      // Verifica que a mensagem de erro menciona odômetro inválido
      // (mensagem exata do backend: "Odômetro inválido: o último valor registrado...")
      expect(alertText).toMatch(/odômetro inválido/i);

      // Verifica que ainda está na página de criação (salvamento foi bloqueado)
      await expect(page).toHaveURL(/\/expenses\/new/);
    },
  );

  /**
   * RF-E2E-05 / EC-E2E-02: aviso de despesa duplicada exibido na tela.
   *
   * Fluxo: cria despesa "Pedágio" (categoria sem odômetro, evita interferência de
   * R-ODO-01) → cria uma segunda despesa idêntica (mesmo veículo, categoria, valor
   * e data) → verifica que o banner de duplicata (SPEC-20260720-002) aparece e que
   * a navegação para `/expenses` só ocorre após clicar em "Entendido".
   *
   * RF-DATA-03: ambos os registros criados são removidos via `/api/backend` (rewrite
   * same-origin para a API — ver `apps/web/next.config.ts`) no `afterEach`, reutilizando
   * a sessão autenticada da suíte.
   *
   * @spec SPEC-20260716-003 RF-E2E-05
   * @spec SPEC-20260601-002 R2
   * @spec SPEC-20260720-002 RF-02, RF-03
   */
  test.describe("EC-E2E-02: aviso de duplicata", () => {
    const createdExpenseIds: string[] = [];

    test.afterEach(async ({ page }) => {
      for (const id of createdExpenseIds.splice(0)) {
        await page.request.delete(`/api/backend/expenses/${id}`).catch(() => undefined);
      }
    });

    test("aviso de duplicata exibido na segunda criação com dados idênticos (R2)", async ({
      page,
    }) => {
      if (!TEST_VEHICLE_PLATE) {
        test.skip(
          true,
          "E2E_TEST_VEHICLE_PLATE não configurado — configure um veículo de teste.",
        );
        return;
      }

      const expenseForm = new ExpenseFormPage(page);

      // Primeira criação — sem duplicata, navega direto para /expenses
      await expenseForm.goto();
      await expenseForm.selectVehicle(TEST_VEHICLE_PLATE);
      await expenseForm.selectCategory("toll");
      await expenseForm.fillAmount("5000");
      const [firstResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes("/api/backend/expenses") && res.request().method() === "POST"),
        expenseForm.submit(),
      ]);
      const firstBody = (await firstResponse.json()) as { id?: string };
      if (firstBody.id) createdExpenseIds.push(firstBody.id);
      await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 8_000 });

      // Segunda criação — mesmos vehicle_id, category, amount e date (default: hoje)
      await expenseForm.goto();
      await expenseForm.selectVehicle(TEST_VEHICLE_PLATE);
      await expenseForm.selectCategory("toll");
      await expenseForm.fillAmount("5000");
      const [secondResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes("/api/backend/expenses") && res.request().method() === "POST"),
        expenseForm.submit(),
      ]);
      const secondBody = (await secondResponse.json()) as { id?: string };
      if (secondBody.id) createdExpenseIds.push(secondBody.id);

      const alertText = await expenseForm.waitForAlert();
      expect(alertText).toMatch(/já existe/i);

      // Navegação adiada: ainda em /expenses/new até clicar em "Entendido"
      await expect(page).toHaveURL(/\/expenses\/new/);

      await expect(page.getByRole("link", { name: /ver despesa duplicada/i })).toHaveAttribute(
        "href",
        `/expenses/${firstBody.id}`,
      );
      await page.getByRole("button", { name: /entendido/i }).click();
      await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 8_000 });
    });
  });
});
