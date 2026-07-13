#!/usr/bin/env node
/**
 * Sobe o ambiente de desenvolvimento completo: mata processos Node presos nas portas
 * de apps/api e apps/web, garante o Supabase local no ar (via `supabase start`, que já
 * gerencia seus próprios containers de forma idempotente) e então inicia api+web em
 * paralelo (turbo run dev).
 *
 * IMPORTANTE: nunca mata processos nas portas do Supabase/Docker (54321-54324). No
 * Windows, o PID dono de uma porta com forwarding de container é frequentemente um
 * processo interno do Docker Desktop (não o container em si) — um `taskkill /F` nele
 * já derrubou o daemon inteiro do Docker em produção real deste script.
 */
import { execSync, spawn } from "node:child_process";

const PORTS = [3000, 3001];
const isWindows = process.platform === "win32";

function killPort(port) {
  try {
    if (isWindows) {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf-8" });
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

console.log("\nSubindo apps/api + apps/web (turbo run dev)...\n");
const dev = spawn("pnpm", ["dev"], { stdio: "inherit", shell: isWindows });

dev.on("exit", (code) => process.exit(code ?? 0));
