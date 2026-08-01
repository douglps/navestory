#!/usr/bin/env node
/**
 * Sobe o ambiente de desenvolvimento completo: mata processos Node presos nas portas
 * de apps/api e apps/web, garante o Supabase local no ar quando `apps/api/.env` aponta
 * para ele (via `supabase start`, que já gerencia seus próprios containers de forma
 * idempotente) e então inicia api+web em paralelo (turbo run dev).
 *
 * Decisão de 2026-07-19: o dev local passou a apontar para o projeto Supabase remoto
 * (`navestory`) por padrão — o banco local via Docker causava drift de migrations/dados
 * temporários difíceis de reproduzir. `supabase start` só roda se `SUPABASE_URL` em
 * `apps/api/.env` apontar para localhost/127.0.0.1 (ou o arquivo não existir ainda),
 * então o script continua funcionando para quem preferir voltar ao banco local.
 *
 * IMPORTANTE: nunca mata processos nas portas do Supabase/Docker (54321-54324). No
 * Windows, o PID dono de uma porta com forwarding de container é frequentemente um
 * processo interno do Docker Desktop (não o container em si) — um `taskkill /F` nele
 * já derrubou o daemon inteiro do Docker em produção real deste script.
 */
import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORTS = [3000, 3001];
const isWindows = process.platform === "win32";

function killPort(port) {
  try {
    if (isWindows) {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf-8",
      });
      const pids = new Set(
        output
          .split("\n")
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid) && pid !== "0"),
      );
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          console.log(`  porta ${port}: processo ${pid} finalizado`);
        } catch {
          // processo já finalizado entre o findstr e o taskkill — ignora
        }
      }
    } else {
      const pids = execSync(`lsof -ti:${port}`, { encoding: "utf-8" }).trim();
      if (pids) {
        execSync(`kill -9 ${pids.split("\n").join(" ")}`, { stdio: "ignore" });
        console.log(`  porta ${port}: processo(s) finalizado(s)`);
      }
    }
  } catch {
    // nenhum processo escutando nessa porta — nada a fazer
  }
}

console.log("Liberando portas (3000, 3001)...");
for (const port of PORTS) {
  killPort(port);
}

function usesLocalSupabase() {
  const envPath = join(__dirname, "..", "apps", "api", ".env");
  if (!existsSync(envPath)) return true;
  const match = readFileSync(envPath, "utf-8").match(/^SUPABASE_URL=(.*)$/m);
  const url = match?.[1]?.trim() ?? "";
  return url === "" || url.includes("localhost") || url.includes("127.0.0.1");
}

if (usesLocalSupabase()) {
  console.log("\nGarantindo Supabase local no ar (supabase start)...");
  try {
    execSync("supabase start", { stdio: "inherit" });
  } catch {
    console.error(
      "\nNão foi possível subir o Supabase local — o Docker Desktop está aberto e rodando?",
    );
    console.error("Abra o Docker Desktop e rode `npm run lab` novamente.");
    process.exit(1);
  }
} else {
  console.log(
    "\napps/api/.env aponta para um Supabase remoto — pulando `supabase start`.",
  );
}

console.log("\nSubindo apps/api + apps/web (turbo run dev)...\n");
const dev = spawn("pnpm", ["dev"], { stdio: "inherit", shell: isWindows });

dev.on("exit", (code) => process.exit(code ?? 0));
