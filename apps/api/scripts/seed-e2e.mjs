#!/usr/bin/env node
// @spec SPEC-20260716-003 RF-DATA-01, RF-DATA-02
//
// Cria (de forma idempotente) o usuário e os veículos de teste exigidos pela suíte E2E
// (Playwright) descrita em specs/qa/SPEC-20260716-003-e2e-playwright.md: um usuário com
// login válido, um veículo com odômetro já registrado (necessário para o hard block de
// R-ODO-01, RF-E2E-04) e um segundo veículo distinto (troca de contexto, RF-E2E-06/07).
//
// Uso:
//   pnpm --filter @nave/api seed:e2e
//
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em apps/api/.env (mesmas credenciais
// já usadas pela API em desenvolvimento). Nunca aponte para o banco de produção real com
// usuários pagantes — este script é destinado a ambientes de teste/staging.

import { existsSync, readFileSync } from "node:fs";
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
  const { data: existing, error: selectError } = await supabase
    .from("vehicles")
    .select("id")
    .eq("user_id", userId)
    .eq("plate", plate)
    .is("deleted_at", null)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) {
    console.log(`Veículo ${plate} já existe (${existing.id}).`);
    return existing.id;
  }

  console.log(`Criando veículo ${plate}...`);
  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: userId,
      plate,
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
    date: yesterday.toISOString().slice(0, 10),
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
  console.log(`\nE2E_BASE_URL=<URL do ambiente onde a suíte vai rodar>`);
}

main().catch((error) => {
  console.error("\nFalha ao rodar o seed de E2E:", error.message ?? error);
  process.exit(1);
});
