#!/usr/bin/env node
/**
 * Roda a suíte E2E completa localmente: seed dos dados de teste + Playwright, sempre
 * com --workers=1 (rodar em paralelo faz vários testes competirem pela mesma conta/veículos
 * de teste, virando ruído difícil de diferenciar de bug real — ver diagnóstico em
 * apps/web/e2e/reports).
 *
 * Pré-requisito: API (localhost:3001) e web (localhost:3000) já rodando via `pnpm dev`.
 * Este script não sobe/derruba os servidores — só valida que estão de pé antes de seguir.
 *
 * Uso:
 *   pnpm e2e                          # roda a suíte inteira
 *   pnpm e2e auth.spec.ts             # roda só um arquivo (repassado pro Playwright)
 *   pnpm e2e -- -g "CT-006"           # repassa qualquer flag do Playwright
 *
 * As credenciais abaixo são de uma conta de teste local/dev, seedada sob demanda pelo
 * próprio script (apps/api/scripts/seed-e2e.mjs) — nunca aponte para produção com isso.
 * Sobrescreva via variável de ambiente se precisar de outro valor.
 */
import { spawnSync } from "node:child_process";

const DEFAULT_ENV = {
  E2E_BASE_URL: "http://localhost:3000",
  E2E_USER_EMAIL: "e2e-tester@nave.test",
  E2E_USER_PASSWORD: "Nave-E2E-Local-Test-2026",
  E2E_TEST_VEHICLE_PLATE: "E2E0A01",
  E2E_VEHICLE_A_PLATE: "E2E0A01",
  E2E_VEHICLE_B_PLATE: "E2E0B02",
};

const env = { ...process.env };
for (const [key, value] of Object.entries(DEFAULT_ENV)) {
  if (!env[key]) env[key] = value;
}

async function checkServer(url, name) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.ok || res.status < 500;
  } catch {
    console.error(`\n[e2e] ${name} não respondeu em ${url}.`);
    console.error(`[e2e] Rode "pnpm dev" (na raiz) numa janela separada e tente de novo.\n`);
    return false;
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
    ...options,
  });
  return result.status ?? 1;
}

async function main() {
  const apiOk = await checkServer("http://localhost:3001/health", "API (localhost:3001)");
  const webOk = await checkServer("http://localhost:3000", "Web (localhost:3000)");
  if (!apiOk || !webOk) process.exit(1);

  console.log("[e2e] Seedando usuário/veículos de teste...");
  const seedStatus = run("pnpm", ["--filter", "@nave/api", "seed:e2e"]);
  if (seedStatus !== 0) {
    console.error("[e2e] Seed falhou — abortando antes de rodar a suíte.");
    process.exit(seedStatus);
  }

  const extraArgs = process.argv.slice(2);
  console.log("\n[e2e] Rodando Playwright (--workers=1)...");
  const testStatus = run(
    "pnpm",
    ["--filter", "@nave/web", "exec", "playwright", "test", "--workers=1", ...extraArgs],
  );
  process.exit(testStatus);
}

main();
