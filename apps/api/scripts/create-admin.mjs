#!/usr/bin/env node
// Cria (ou promove) uma conta admin, gravando app_metadata.role = "admin" via
// Supabase Admin API (service role key). É o único mecanismo suportado hoje para
// conceder o primeiro admin — a UI de gestão de roles (PATCH /admin/users/:id/role)
// só funciona depois que já existe pelo menos um admin autenticado.
// Ver specs/admin/SPEC-20260731-008-painel-admin-gestao-roles-ui.md.
//
// Uso:
//   pnpm --filter @navestory/api create:admin
//   (ou: node apps/api/scripts/create-admin.mjs)
//
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em apps/api/.env.
//
// Variáveis obrigatórias:
//   ADMIN_EMAIL, ADMIN_PASSWORD

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
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos em apps/api/.env.",
  );
  process.exit(1);
}

if (!EMAIL || !PASSWORD) {
  console.error(
    "Erro: defina ADMIN_EMAIL e ADMIN_PASSWORD antes de rodar o script.\n" +
      "Exemplo: ADMIN_EMAIL=voce@exemplo.com ADMIN_PASSWORD='SenhaForte123*' pnpm --filter @navestory/api create:admin",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function main() {
  const existing = await findUserByEmail(EMAIL);

  if (existing) {
    if (existing.app_metadata?.role === "admin") {
      console.log(`Usuário ${EMAIL} já é admin. Nada a fazer.`);
      return;
    }
    console.log(`Usuário ${EMAIL} já existe — promovendo a admin...`);
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      app_metadata: { ...existing.app_metadata, role: "admin" },
    });
    if (error) throw error;
    console.log(`Pronto: ${EMAIL} agora é admin.`);
    return;
  }

  console.log(`Criando conta admin ${EMAIL}...`);
  const { error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  if (error) throw error;
  console.log(`Pronto: conta admin ${EMAIL} criada.`);
}

main().catch((error) => {
  console.error("\nFalha ao criar/promover conta admin:", error.message ?? error);
  process.exit(1);
});
