#!/usr/bin/env node
// @spec SPEC-20260716-003 RF-DATA-01, RF-DATA-02
//
// Cria (de forma idempotente) os usuários e veículos de teste exigidos pela suíte E2E
// (Playwright) descrita em specs/qa/SPEC-20260716-003-e2e-playwright.md:
//
// Usuário principal (E2E_USER_EMAIL):
//   - Um usuário com login válido (RF-E2E-02, RF-E2E-03, RF-E2E-08)
//   - Veículo A com odômetro já registrado (hard block R-ODO-01, RF-E2E-04)
//   - Veículo B distinto (troca de contexto, RF-E2E-06/07)
//
// Usuário sem veículos (E2E_USER_NO_VEHICLES_EMAIL) — opcional, RF-E2E-10:
//   - Conta criada sem nenhum veículo associado
//   - Reutiliza E2E_USER_PASSWORD como senha
//   - Se E2E_USER_NO_VEHICLES_EMAIL não estiver definido, esse usuário é ignorado e
//     o teste RF-E2E-10 ficará marcado como `skip` na suíte
//
// Uso:
//   pnpm --filter @nave/api seed:e2e
//
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em apps/api/.env (mesmas credenciais
// já usadas pela API em desenvolvimento). Nunca aponte para o banco de produção real com
// usuários pagantes — este script é destinado a ambientes de teste/staging.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos em apps/api/.env.",
  );
  process.exit(1);
}

const EMAIL = process.env.E2E_USER_EMAIL ?? "e2e-tester@nave.test";
const PASSWORD_WAS_GENERATED = !process.env.E2E_USER_PASSWORD;
const PASSWORD = process.env.E2E_USER_PASSWORD ?? randomBytes(12).toString("base64url");
const VEHICLE_A_PLATE = process.env.E2E_VEHICLE_A_PLATE ?? "E2E0A01";
const VEHICLE_B_PLATE = process.env.E2E_VEHICLE_B_PLATE ?? "E2E0B02";
// RF-E2E-04/05 reaproveitam o mesmo veículo do teste de contexto A por padrão.
const TEST_VEHICLE_PLATE = process.env.E2E_TEST_VEHICLE_PLATE ?? VEHICLE_A_PLATE;
// RF-E2E-10: usuário sem veículos. Se não definido, o seed apenas pula e o teste fica skip.
const NO_VEHICLES_EMAIL = process.env.E2E_USER_NO_VEHICLES_EMAIL ?? "";

const BASELINE_ODOMETER_KM = 15000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findUserByEmail(email) {
  // admin.listUsers pagina — o volume de usuários de um ambiente de teste é pequeno,
  // então uma única página (padrão: 50) é suficiente na prática.
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function ensureUser() {
  const existing = await findUserByEmail(EMAIL);
  if (existing) {
    console.log(`Usuário já existe (${EMAIL}) — atualizando senha para o valor configurado.`);
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
    });
    if (error) throw error;
    return existing.id;
  }

  console.log(`Criando usuário de teste ${EMAIL}...`);
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "E2E Tester" },
  });
  if (error) throw error;
  return data.user.id;
}

/**
 * Versão genérica de ensureUser para qualquer email/senha, usada pelo usuário sem veículos
 * (RF-E2E-10). Cria o usuário sem associar nenhum veículo — a ausência de veículos é o
 * estado de teste que interessa.
 */
async function ensureUserByEmail(email, password) {
  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(`Usuário já existe (${email}) — atualizando senha.`);
    const { error } = await supabase.auth.admin.updateUserById(existing.id, { password });
    if (error) throw error;
    return existing.id;
  }

  console.log(`Criando usuário sem veículos ${email}...`);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E No-Vehicles Tester" },
  });
  if (error) throw error;
  return data.user.id;
}

async function waitForProfile(userId) {
  // O trigger on_auth_user_created cria o profile de forma assíncrona em relação ao
  // retorno do createUser — pequena espera evita corrida com os inserts seguintes.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (data) return;
    await sleep(300);
  }
  throw new Error(
    `Profile não apareceu para o usuário ${userId} após 3s — verifique o trigger handle_new_user.`,
  );
}

async function ensureVehicle(userId, plate) {
  // Apelido = a própria placa: os dois veículos de teste têm make/model idênticos
  // ("Nave" / "E2E Test Car"), e o Combobox de veículo do formulário de despesa exibe
  // `nickname ?? (make + model) ?? plate` — sem nickname, as duas opções ficam com o
  // mesmo texto visível ("Nave E2E Test Car"), impossíveis de distinguir por seletor de
  // texto na suíte E2E (`expense-form.page.ts`/`ExpenseFormPage.selectVehicle`).
  const nickname = plate;

  const { data: existing, error: selectError } = await supabase
    .from("vehicles")
    .select("id, nickname")
    .eq("user_id", userId)
    .eq("plate", plate)
    .is("deleted_at", null)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) {
    if (existing.nickname !== nickname) {
      console.log(`Veículo ${plate} já existe (${existing.id}) — atualizando nickname.`);
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ nickname })
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      console.log(`Veículo ${plate} já existe (${existing.id}).`);
    }
    return existing.id;
  }

  console.log(`Criando veículo ${plate}...`);
  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: userId,
      plate,
      nickname,
      make: "Nave",
      model: "E2E Test Car",
      year: 2024,
      model_year: 2024,
      fuel_type: "gasoline",
      odometer: BASELINE_ODOMETER_KM,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureOdometerBaseline(userId, vehicleId) {
  const { data: existing, error: selectError } = await supabase
    .from("expenses")
    .select("id, odometer_km")
    .eq("vehicle_id", vehicleId)
    .eq("category", "fuel")
    .not("odometer_km", "is", null)
    .order("odometer_km", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) {
    console.log(
      `Veículo já tem despesa de combustível com odômetro (${existing.odometer_km} km) — ok para RF-E2E-04.`,
    );
    return;
  }

  console.log(`Criando despesa de combustível com odômetro baseline (${BASELINE_ODOMETER_KM} km)...`);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { error } = await supabase.from("expenses").insert({
    user_id: userId,
    vehicle_id: vehicleId,
    category: "fuel",
    amount: 250.0,
    occurred_at: yesterday.toISOString(),
    odometer_km: BASELINE_ODOMETER_KM,
    liters: 40,
    fuel_type: "gasoline",
    full_tank: true,
    description: "Seed E2E — baseline de odômetro",
  });
  if (error) throw error;
}

async function main() {
  const userId = await ensureUser();
  await waitForProfile(userId);

  const vehicleAId = await ensureVehicle(userId, VEHICLE_A_PLATE);
  await ensureVehicle(userId, VEHICLE_B_PLATE);

  // Baseline de odômetro fica no veículo referenciado por E2E_TEST_VEHICLE_PLATE.
  const testVehicleId =
    TEST_VEHICLE_PLATE === VEHICLE_A_PLATE
      ? vehicleAId
      : await ensureVehicle(userId, TEST_VEHICLE_PLATE);
  await ensureOdometerBaseline(userId, testVehicleId);

  // RF-E2E-10: usuário sem veículos (skip silencioso se a variável não estiver definida)
  if (NO_VEHICLES_EMAIL) {
    console.log(`\nCriando/verificando usuário sem veículos para RF-E2E-10 (${NO_VEHICLES_EMAIL})...`);
    const noVehiclesUserId = await ensureUserByEmail(NO_VEHICLES_EMAIL, PASSWORD);
    await waitForProfile(noVehiclesUserId);
    console.log("Usuário sem veículos OK — nenhum veículo será criado para esta conta.");
  } else {
    console.log(
      "\nAVISO: E2E_USER_NO_VEHICLES_EMAIL não definido — teste RF-E2E-10 ficará marcado como skip.",
    );
    console.log(
      "Para habilitar, defina E2E_USER_NO_VEHICLES_EMAIL (ex: e2e-no-vehicles@nave.test) e reexecute.",
    );
  }

  console.log("\nSeed E2E concluído. Cadastre estes valores como GitHub Secrets");
  console.log("(Settings → Secrets and variables → Actions) e não os commite em lugar nenhum:\n");
  console.log(`E2E_USER_EMAIL=${EMAIL}`);
  // Só imprime a senha em texto claro quando ela foi gerada agora — se veio de
  // E2E_USER_PASSWORD já configurada no ambiente, evita reimprimir credencial
  // existente em terminal/log compartilhado.
  console.log(
    PASSWORD_WAS_GENERATED
      ? `E2E_USER_PASSWORD=${PASSWORD}`
      : "E2E_USER_PASSWORD=*** (já configurada no ambiente, mantida sem alteração)",
  );
  console.log(`E2E_TEST_VEHICLE_PLATE=${TEST_VEHICLE_PLATE}`);
  console.log(`E2E_VEHICLE_A_PLATE=${VEHICLE_A_PLATE}`);
  console.log(`E2E_VEHICLE_B_PLATE=${VEHICLE_B_PLATE}`);
  if (NO_VEHICLES_EMAIL) {
    console.log(`E2E_USER_NO_VEHICLES_EMAIL=${NO_VEHICLES_EMAIL}`);
  }
  console.log(`\nE2E_BASE_URL=<URL do ambiente onde a suíte vai rodar>`);
}

main().catch((error) => {
  console.error("\nFalha ao rodar o seed de E2E:", error.message ?? error);
  process.exit(1);
});
