#!/usr/bin/env node
// Popula um usuário de teste com dados ALEATÓRIOS e realistas em todo o domínio do
// sistema (veículos, despesas, manutenções, multas, custos recorrentes, grupos,
// templates, categorias custom e preferências de dashboard), para que telas de
// analytics/dashboard/listagens tenham volume suficiente para serem avaliadas.
//
// Diferente do seed-e2e.mjs (que cria um estado mínimo e determinístico para a suíte
// Playwright), este script gera dados variados a cada execução e é ADITIVO — rodar
// de novo cria mais histórico, não substitui o que já existe.
//
// Uso:
//   pnpm --filter @navestory/api seed:random
//   (ou: node apps/api/scripts/seed-random-data.mjs)
//
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em apps/api/.env — aponte SEMPRE
// para um projeto de teste/staging, nunca para produção com usuários pagantes.
//
// Variáveis opcionais:
//   SEED_USER_EMAIL, SEED_USER_PASSWORD  — usuário alvo (default: 123@teste.com)
//   SEED_VEHICLE_COUNT                    — quantos veículos criar (default: 2)
//   SEED_MONTHS_HISTORY                   — meses de histórico de despesas (default: 8)

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
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

const EMAIL = process.env.SEED_USER_EMAIL ?? "123@teste.com";
const PASSWORD = process.env.SEED_USER_PASSWORD ?? "A12346*";
const VEHICLE_COUNT = Number(process.env.SEED_VEHICLE_COUNT ?? 2);
const MONTHS_HISTORY = Number(process.env.SEED_MONTHS_HISTORY ?? 8);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function randPick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function randomPlate() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letter = () => letters[randInt(0, letters.length - 1)];
  const digit = () => String(randInt(0, 9));
  // Formato antigo LLL-DDDD, compatível com o regex ^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$
  return `${letter()}${letter()}${letter()}${digit()}${digit()}${digit()}${digit()}`;
}

const MAKES_MODELS = {
  Volkswagen: ["Gol", "Polo", "T-Cross", "Virtus"],
  Chevrolet: ["Onix", "Tracker", "Cruze", "Spin"],
  Fiat: ["Argo", "Toro", "Mobi", "Pulse"],
  Toyota: ["Corolla", "Yaris", "Hilux", "SW4"],
  Honda: ["Civic", "HR-V", "City", "Fit"],
  Hyundai: ["HB20", "Creta", "Tucson", "HB20S"],
  Renault: ["Kwid", "Duster", "Sandero", "Logan"],
  Ford: ["Ka", "EcoSport", "Ranger", "Territory"],
};

const FUEL_TYPES = ["gasoline", "ethanol"];
const GROUP_COLORS = [
  "#6366f1",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#ec4899",
];

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function ensureUser() {
  const existing = await findUserByEmail(EMAIL);
  if (existing) {
    console.log(`Usuário já existe (${EMAIL}) — reaproveitando.`);
    return existing.id;
  }
  console.log(`Criando usuário ${EMAIL}...`);
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Usuário Demo" },
  });
  if (error) throw error;
  return data.user.id;
}

async function waitForProfile(userId) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (data) return;
    await sleep(300);
  }
  throw new Error(`Profile não apareceu para o usuário ${userId} após 3s.`);
}

async function createVehicle(userId) {
  const make = randPick(Object.keys(MAKES_MODELS));
  // eslint-disable-next-line security/detect-object-injection -- make vem de Object.keys(MAKES_MODELS), sempre uma chave válida
  const model = randPick(MAKES_MODELS[make]);
  const year = randInt(2016, 2024);
  const baselineOdometer = randInt(8000, 45000);
  const fuelType = randPick(FUEL_TYPES);

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: userId,
      plate: randomPlate(),
      make,
      model,
      year,
      model_year: year,
      nickname: `${model} ${randPick(["do dia a dia", "da família", "de trabalho", "de fim de semana"])}`,
      vehicle_type: "carro",
      fuel_type: fuelType,
      favorite_fuel_type: fuelType,
      odometer: baselineOdometer,
      fuel_efficiency: randFloat(8, 14, 1),
      fuel_liters_capacity: randInt(40, 60),
      status: "parking",
    })
    .select("id, plate, odometer")
    .single();
  if (error) throw error;
  console.log(`  Veículo criado: ${make} ${model} (${data.plate})`);
  return data;
}

async function ensureGroupWithVehicles(userId, vehicles) {
  const { data: group, error } = await supabase
    .from("vehicle_groups")
    .insert({
      user_id: userId,
      name: `Frota ${new Date().toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}`,
      color: randPick(GROUP_COLORS),
    })
    .select("id")
    .single();
  if (error) throw error;

  const members = vehicles.map((v) => ({
    group_id: group.id,
    vehicle_id: v.id,
  }));
  const { error: membersError } = await supabase
    .from("vehicle_group_members")
    .insert(members);
  if (membersError) throw membersError;
  console.log(`  Grupo de veículos criado com ${vehicles.length} membro(s).`);
}

// Gera despesas de combustível em ordem cronológica crescente de odômetro (R-ODO),
// e demais categorias com odometer_km = null para não colidir com o hard block.
async function seedExpenses(userId, vehicle) {
  const rows = [];
  const totalDays = MONTHS_HISTORY * 30;
  let odometer = vehicle.odometer;

  // Combustível: a cada ~15-20 dias, abastecimento completo com odômetro crescente.
  let dayCursor = totalDays;
  while (dayCursor > 2) {
    dayCursor -= randInt(13, 20);
    if (dayCursor < 0) break;
    odometer += randInt(400, 900);
    const liters = randFloat(28, 50, 1);
    const pricePerLiter = randFloat(5.4, 6.8, 2);
    rows.push({
      user_id: userId,
      vehicle_id: vehicle.id,
      category: "fuel",
      amount: Number((liters * pricePerLiter).toFixed(2)),
      occurred_at: daysAgo(dayCursor).toISOString(),
      odometer_km: odometer,
      liters,
      fuel_type: vehicle.fuel_type ?? "gasoline",
      full_tank: true,
      supplier: randPick([
        "Posto Ipiranga",
        "Posto Shell",
        "Posto BR",
        "Posto Raízen",
      ]),
      description: "Abastecimento",
    });
  }

  const scattered = [
    {
      category: "maintenance",
      count: 6,
      min: 120,
      max: 1800,
      desc: [
        "Troca de óleo",
        "Revisão preventiva",
        "Troca de pastilhas de freio",
        "Alinhamento e balanceamento",
      ],
    },
    {
      category: "washing",
      count: 6,
      min: 35,
      max: 90,
      desc: ["Lavagem completa", "Lavagem simples", "Lavagem a seco"],
    },
    {
      category: "toll",
      count: 10,
      min: 5,
      max: 28,
      desc: ["Pedágio rodovia", "Pedágio ponte"],
    },
    {
      category: "parking",
      count: 10,
      min: 8,
      max: 60,
      desc: ["Estacionamento shopping", "Estacionamento centro", "Zona azul"],
    },
    {
      category: "tax",
      count: 2,
      min: 300,
      max: 1800,
      desc: ["IPVA parcela", "Taxa de licenciamento"],
    },
    {
      category: "fine",
      count: 3,
      min: 88,
      max: 350,
      desc: ["Multa de trânsito"],
    },
    {
      category: "insurance",
      count: 4,
      min: 150,
      max: 400,
      desc: ["Parcela do seguro"],
    },
    {
      category: "other",
      count: 4,
      min: 50,
      max: 300,
      desc: ["Despesa diversa", "Acessório", "Documentação"],
    },
  ];

  for (const group of scattered) {
    for (let i = 0; i < group.count; i += 1) {
      rows.push({
        user_id: userId,
        vehicle_id: vehicle.id,
        category: group.category,
        amount: randFloat(group.min, group.max),
        occurred_at: daysAgo(randInt(1, totalDays)).toISOString(),
        odometer_km: null,
        description: randPick(group.desc),
      });
    }
  }

  const { error } = await supabase.from("expenses").insert(rows);
  if (error) throw error;
  console.log(`  ${rows.length} despesas criadas.`);
}

async function seedMaintenances(userId, vehicle) {
  const descriptions = [
    "Troca de óleo e filtro",
    "Revisão dos freios",
    "Alinhamento e balanceamento",
    "Revisão de 20.000 km",
    "Troca de correia dentada",
    "Troca de bateria",
  ];
  const rows = [];

  // Concluídas no passado
  for (let i = 0; i < 3; i += 1) {
    const scheduled = daysAgo(randInt(30, MONTHS_HISTORY * 30));
    const completion = new Date(scheduled);
    completion.setDate(completion.getDate() + randInt(0, 2));
    rows.push({
      user_id: userId,
      vehicle_id: vehicle.id,
      description: randPick(descriptions),
      status: "completed",
      scheduled_date: scheduled.toISOString(),
      completion_date: completion.toISOString(),
      cost: randFloat(120, 1800),
      odometer_km: randInt(
        Math.max(0, vehicle.odometer - 20000),
        vehicle.odometer,
      ),
    });
  }

  // Agendada para os próximos dias (alimenta "próxima manutenção" / "custos próximos 7d")
  rows.push({
    user_id: userId,
    vehicle_id: vehicle.id,
    description: randPick(descriptions),
    status: "scheduled",
    scheduled_date: daysFromNow(randInt(2, 6)).toISOString(),
    cost: randFloat(150, 900),
  });

  // Em andamento
  rows.push({
    user_id: userId,
    vehicle_id: vehicle.id,
    description: randPick(descriptions),
    status: "in_progress",
    scheduled_date: daysAgo(randInt(0, 2)).toISOString(),
    cost: randFloat(150, 900),
  });

  const { error } = await supabase.from("maintenances").insert(rows);
  if (error) throw error;
  console.log(`  ${rows.length} manutenções criadas.`);
}

async function seedFines(userId, vehicle) {
  const descriptions = [
    "Excesso de velocidade",
    "Estacionamento proibido",
    "Avanço de sinal vermelho",
    "Uso de celular ao dirigir",
    "Cinto de segurança",
  ];
  const statuses = ["pending", "paid", "appealing"];
  const rows = [];

  for (let i = 0; i < 3; i += 1) {
    const occurred = daysAgo(randInt(5, MONTHS_HISTORY * 30));
    const due = new Date(occurred);
    due.setDate(due.getDate() + 30);
    const status = randPick(statuses);
    rows.push({
      user_id: userId,
      vehicle_id: vehicle.id,
      description: randPick(descriptions),
      infraction_code: `${randInt(500, 799)}-${randInt(0, 9)}`,
      amount: randFloat(88, 350),
      occurred_at: occurred.toISOString().slice(0, 10),
      due_date: due.toISOString().slice(0, 10),
      paid_at: status === "paid" ? due.toISOString().slice(0, 10) : null,
      status,
    });
  }

  const { error } = await supabase.from("fines").insert(rows);
  if (error) throw error;
  console.log(`  ${rows.length} multas criadas.`);
}

async function seedRecurringCosts(userId, vehicle) {
  const year = new Date().getFullYear();
  const rows = [
    {
      user_id: userId,
      vehicle_id: vehicle.id,
      cost_type: "ipva",
      year,
      amount: randFloat(800, 3500),
      due_date: `${year}-03-31`,
      paid_at: `${year}-03-15`,
    },
    {
      user_id: userId,
      vehicle_id: vehicle.id,
      cost_type: "insurance",
      year,
      amount: randFloat(1200, 4500),
      due_date: daysFromNow(randInt(10, 60)).toISOString().slice(0, 10),
    },
  ];
  const { error } = await supabase.from("vehicle_recurring_costs").insert(rows);
  if (error) throw error;
  console.log(`  ${rows.length} custos recorrentes criados.`);
}

async function seedExpenseTemplates(userId, vehicle) {
  const { count } = await supabase
    .from("expense_templates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) >= 18) {
    console.log("  Limite de templates próximo do máximo (20) — pulando.");
    return;
  }

  const rows = [
    {
      name: "Abastecimento padrão",
      category: "fuel",
      amount: randFloat(180, 300),
      liters: randFloat(35, 45),
      fuel_type: vehicle.fuel_type ?? "gasoline",
    },
    {
      name: "Troca de óleo",
      category: "maintenance",
      amount: randFloat(200, 450),
    },
    {
      name: "Lavagem completa",
      category: "washing",
      amount: randFloat(40, 80),
    },
  ].map((t) => ({ user_id: userId, vehicle_id: vehicle.id, ...t }));

  const { error } = await supabase.from("expense_templates").insert(rows);
  if (error) throw error;
  console.log(`  ${rows.length} templates de despesa criados.`);
}

async function seedUserCategories(userId) {
  const candidates = [
    { value: "acessorios", label: "Acessórios" },
    { value: "estacionamento_mensal", label: "Estacionamento mensal" },
  ];
  for (const cat of candidates) {
    const { error } = await supabase
      .from("user_categories")
      .upsert({ user_id: userId, ...cat }, { onConflict: "user_id,value" });
    if (error) throw error;
  }
  console.log(`  ${candidates.length} categorias custom garantidas.`);
}

async function seedPreferences(userId) {
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      vehicle_chip_fields: ["plate", "make", "nickname"],
      dashboard_kpi_ids: [
        "expenses_month",
        "cost_per_km",
        "fleet_health",
        "urgent_maintenance",
        "upcoming_costs_7d",
        "expense_anomalies",
      ],
      auto_draft_enabled: true,
      timezone: "America/Sao_Paulo",
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  console.log("  Preferências de dashboard configuradas.");
}

async function main() {
  console.log(`Populando dados aleatórios para ${EMAIL}...\n`);
  const userId = await ensureUser();
  await waitForProfile(userId);

  const vehicles = [];
  for (let i = 0; i < VEHICLE_COUNT; i += 1) {
    vehicles.push(await createVehicle(userId));
  }

  if (vehicles.length > 1) {
    await ensureGroupWithVehicles(userId, vehicles);
  }

  for (const vehicle of vehicles) {
    console.log(`\nGerando histórico para veículo ${vehicle.plate}...`);
    await seedExpenses(userId, vehicle);
    await seedMaintenances(userId, vehicle);
    await seedFines(userId, vehicle);
    await seedRecurringCosts(userId, vehicle);
    await seedExpenseTemplates(userId, vehicle);
  }

  await seedUserCategories(userId);
  await seedPreferences(userId);

  console.log("\nSeed de dados aleatórios concluído.");
  console.log(`Login: ${EMAIL} / ${PASSWORD}`);
}

main().catch((error) => {
  console.error(
    "\nFalha ao rodar o seed de dados aleatórios:",
    error.message ?? error,
  );
  process.exit(1);
});
