// @spec SPEC-20260716-003 RF-E2E-06, RF-E2E-07, RF-E2E-10, RF-E2E-11
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
/**
 * Email do usuário de teste sem veículos cadastrados (RF-E2E-10).
 * Se não configurado, o teste é marcado como `skip` com instrução de provisionamento.
 * Senha reutiliza E2E_USER_PASSWORD (conta no mesmo ambiente, apenas sem veículos).
 */
const USER_NO_VEHICLES_EMAIL = process.env.E2E_USER_NO_VEHICLES_EMAIL ?? "";

test.describe("Troca de contexto de veículo", () => {
  /**
   * RF-E2E-06 / REG-E2E-01: chip de contexto atualiza após seleção no Dialog.
   *
   * Fluxo:
   * 1. navega para /dashboard (sessão autenticada)
   * 2. Clica no VehicleContextChip → verifica abertura do Dialog/Sheet
   * 3. Seleciona veículo B via busca
   * 4. Verifica que o chip atualiza para exibir o nome/placa do veículo B
   * 5. navega para outra rota e verifica que o contexto persiste
   *
   * @spec SPEC-20260716-003 RF-E2E-06
   * @spec SPEC-20260603-001 RF-07, R-CTX-07
   */
  test("REG-E2E-01: chip de contexto atualiza após seleção no dialog (R-CTX-07)", async ({
    page,
  }) => {
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
    // domcontentloaded em vez do "load" padrão — ver nota em dashboard.page.ts
    await page.goto("/expenses", { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/expenses");

    // Chip ainda deve exibir veículo B após navegação — a leitura do contexto
    // (sessionStorage) acontece num efeito React pós-montagem, então o chip renderiza
    // primeiro com o rótulo genérico ("Em foco: veículo selecionado") antes de
    // hidratar com o veículo real; espera explicitamente em vez de ler no mesmo tick.
    await contextChip.waitForChipUpdate(VEHICLE_B_PLATE);
    const chipLabelAfterNav = await contextChip.getChipAriaLabel();
    expect(chipLabelAfterNav).toContain(VEHICLE_B_PLATE);
  });

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
  test("REG-E2E-02: campo vehicle_id do formulário atualiza ao trocar contexto com chip (R-CTX-06, R-CTX-07)", async ({
    page,
  }) => {
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

    // Campo herdado do contexto — label âmbar "↩ Herdado do contexto em foco" visível.
    // O cálculo de herança roda num efeito React pós-montagem (mesma race do chip acima)
    // — espera o hint aparecer em vez de checar isVisible() no mesmo tick do goto().
    await expenseForm.inheritedHint
      .first()
      .waitFor({ state: "visible", timeout: 5_000 });
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
    await applyContextChangeButton.waitFor({
      state: "visible",
      timeout: 5_000,
    });
    await applyContextChangeButton.click();

    // Passo 5: vehicle_id agora deve refletir veículo B (valor diferente de vehicleAId)
    const vehicleBId = await expenseForm.getSelectedVehicleId();
    expect(vehicleBId).toBeTruthy();
    expect(vehicleBId).not.toEqual(vehicleAId);
  });

  /**
   * RF-E2E-10: usuário sem veículos → Dialog de contexto exibe estado vazio, não erro JS.
   *
   * Valida que o `VehicleSwitcherContent` renderiza corretamente quando a API retorna listas
   * vazias: deve exibir "Nenhum veículo encontrado" e "Nenhum grupo encontrado" em vez de
   * travar, exibir erro ou gerar exceção no console.
   *
   * PRÉ-CONDIÇÃO (BLOQUEIO PARCIAL): exige uma conta de usuário de teste separada, sem
   * nenhum veículo cadastrado, acessível via variável de ambiente `E2E_USER_NO_VEHICLES_EMAIL`.
   * Se a variável não estiver configurada, o teste é marcado como `skip` até que a
   * infraestrutura de dados seja provisionada.
   *
   * PARA PROVISIONAMENTO:
   *   1. Criar conta de usuário no ambiente E2E (ex: `sem-veiculos@navestory-e2e.test`)
   *   2. Não cadastrar nenhum veículo para essa conta
   *   3. Configurar GitHub Secret `E2E_USER_NO_VEHICLES_EMAIL` com o email criado
   *   4. A senha pode reutilizar `E2E_USER_PASSWORD` (mesma para todas as contas de teste)
   *   5. Adicionar seed da conta no script `apps/api/scripts/seed-e2e.mjs`
   *
   * @spec SPEC-20260716-003 RF-E2E-10
   * @spec SPEC-20260603-001 R-CTX-07
   */
  test("RF-E2E-10: usuário sem veículos vê estado vazio no dialog de contexto (R-CTX-07)", async ({
    browser,
  }) => {
    if (!USER_NO_VEHICLES_EMAIL) {
      test.skip(
        true,
        [
          "BLOQUEADO: E2E_USER_NO_VEHICLES_EMAIL não configurado.",
          "Para habilitar este teste, provisione uma conta de usuário sem veículos e configure",
          "a variável de ambiente E2E_USER_NO_VEHICLES_EMAIL com o email dessa conta.",
          "Veja o comentário @spec SPEC-20260716-003 RF-E2E-10 neste arquivo para instruções completas.",
        ].join(" "),
      );
      return;
    }

    const password = process.env.E2E_USER_PASSWORD;
    if (!password) {
      throw new Error(
        "E2E_USER_PASSWORD é obrigatória para RF-E2E-10 (login do usuário sem veículos).",
      );
    }

    // Contexto SEM storageState — faz login com a conta sem veículos
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    try {
      // Login com a conta dedicada sem veículos
      const { LoginPage } = await import("../pages/login.page");
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(USER_NO_VEHICLES_EMAIL, password);
      await loginPage.waitForDashboard();

      const contextChip = new VehicleContextChipPage(page);

      // Abre o Dialog/Sheet de seleção de veículo
      await contextChip.openDialog();

      // Campo de busca visível — Dialog abriu sem erro JS
      await expect(contextChip.searchInput).toBeVisible();

      // Estado vazio de veículos: texto "Nenhum veículo encontrado"
      // (renderizado por VehicleSwitcherContent quando filteredVehicles.length === 0)
      const emptyVehicleMessage = page.getByText("Nenhum veículo encontrado");
      await expect(emptyVehicleMessage).toBeVisible({ timeout: 8_000 });

      // Estado vazio de grupos: texto "Nenhum grupo encontrado"
      const emptyGroupMessage = page.getByText("Nenhum grupo encontrado");
      await expect(emptyGroupMessage).toBeVisible({ timeout: 8_000 });

      // Ausência de erro JS — nenhuma mensagem de erro visível na UI
      const errorPanel = page.locator('[class*="red-50"]');
      await expect(errorPanel).not.toBeVisible();
    } finally {
      await context.close();
    }
  });

  /**
   * RF-E2E-11: busca sem resultado no Dialog de contexto não trava a UI.
   *
   * Com o Dialog aberto (usuário NORMAL, com veículos), digita uma string que não
   * corresponde a nenhum veículo ou grupo cadastrado. Verifica:
   *   - "Nenhum veículo encontrado" e "Nenhum grupo encontrado" aparecem
   *   - Nenhum erro JS / tela em branco
   *   - O Dialog continua respondendo: é possível limpar o campo e o estado se restaura
   *
   * Não depende de dado especial — roda com a infraestrutura atual (storageState do globalSetup).
   *
   * @spec SPEC-20260716-003 RF-E2E-11
   * @spec SPEC-20260603-001 R-CTX-07
   */
  test("RF-E2E-11: busca sem resultado no dialog de contexto não trava a UI (R-CTX-07)", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    const contextChip = new VehicleContextChipPage(page);

    await dashboardPage.goto();
    await dashboardPage.waitForLoad();

    // Abre o Dialog de seleção
    await contextChip.openDialog();
    await expect(contextChip.searchInput).toBeVisible();

    // Busca por string que certamente não existe em nenhum cadastro de teste
    await contextChip.searchInput.fill("zzz-nonexistent-999");

    // Ambas as seções devem mostrar "Nenhum X encontrado"
    // (VehicleSwitcherContent renderiza esses spans quando filteredX.length === 0)
    const emptyVehicleMessage = page.getByText("Nenhum veículo encontrado");
    await expect(emptyVehicleMessage).toBeVisible({ timeout: 5_000 });

    const emptyGroupMessage = page.getByText("Nenhum grupo encontrado");
    await expect(emptyGroupMessage).toBeVisible({ timeout: 5_000 });

    // O Dialog continua respondendo: limpa a busca e verifica restauração
    await contextChip.searchInput.clear();

    // Após limpar, o campo de busca ainda deve estar visível (Dialog não fechou/travou)
    await expect(contextChip.searchInput).toBeVisible();
    // Mensagens de "Nenhum X encontrado" devem desaparecer com a busca limpa
    // (só persistem se não houver veículos — com storageState normal, devem sumir)
    await expect(emptyVehicleMessage).not.toBeVisible({ timeout: 5_000 });
  });
});
