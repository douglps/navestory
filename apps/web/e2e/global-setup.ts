// @spec SPEC-20260716-003 RF-CFG-08, RF-DATA-01, S1
import path from "path";
import { chromium, type FullConfig } from "@playwright/test";

/**
 * Setup global do Playwright: realiza login UMA VEZ antes de toda a suíte e
 * salva o storageState (cookies) em `e2e/auth-state.json`.
 *
 * Testes que precisam de sessão autenticada reutilizam este state sem repetir o
 * fluxo de login. Testes que validam o próprio login/logout usam contexto limpo.
 *
 * Credenciais: obrigatoriamente via variáveis de ambiente (RF-DATA-01, RNF-04).
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    process.env.E2E_BASE_URL ??
    config.projects[0]?.use?.baseURL ??
    "http://localhost:3000";

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "[globalSetup] Variáveis de ambiente E2E_USER_EMAIL e E2E_USER_PASSWORD são obrigatórias.",
    );
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // domcontentloaded em vez do "load" padrão — ver nota em dashboard.page.ts
    await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });

    // Aguarda o formulário estar visível e pronto
    await page.getByLabel("E-mail").waitFor({ state: "visible" });

    await page.getByLabel("E-mail").fill(email);
    // exact: true evita colisão com o botão "Mostrar senha"/"Ocultar senha" do PasswordInput,
    // cujo aria-label contém "senha" como substring
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();

    // Aguarda redirect para /dashboard após login bem-sucedido
    await page.waitForURL(`${baseURL}/dashboard`, { timeout: 15_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[globalSetup] Falha no login E2E (verifique E2E_USER_EMAIL/E2E_USER_PASSWORD e se a stack está rodando): ${message}`,
    );
  } finally {
    // Salva cookies + localStorage para reutilização nos testes
    const authStatePath = path.resolve(process.cwd(), "e2e", "auth-state.json");
    await context.storageState({ path: authStatePath });
    await browser.close();
  }
}
