import { createClient } from "@supabase/supabase-js";
import { createUserScopedClient } from "../../src/shared/supabase/create-user-scoped-client";

/**
 * @spec specs/TESTS_SPEC.md CT-007 — acesso a recurso de outro usuário retorna vazio/erro
 * por RLS (S2). Roda contra Supabase local real, nunca mocka o banco.
 */
describe("RLS em profiles (integração, Supabase local)", () => {
  const url = process.env.SUPABASE_URL as string;
  const anonKey = process.env.SUPABASE_ANON_KEY as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  const admin = createClient(url, serviceRoleKey);

  let userAId: string;
  let userAToken: string;
  let userBId: string;

  beforeAll(async () => {
    const anon = createClient(url, anonKey);

    const userA = await anon.auth.signUp({
      email: `rls-a-${Date.now()}@example.com`,
      password: "abc12!",
    });
    userAId = userA.data.user!.id;
    userAToken = userA.data.session!.access_token;

    const userB = await anon.auth.signUp({
      email: `rls-b-${Date.now()}@example.com`,
      password: "abc12!",
    });
    userBId = userB.data.user!.id;
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userAId).catch(() => undefined);
    await admin.auth.admin.deleteUser(userBId).catch(() => undefined);
  });

  it("CT-007: usuário A não consegue ler o profile do usuário B (RLS bloqueia)", async () => {
    const clientAsUserA = createUserScopedClient(url, anonKey, userAToken);

    const { data, error } = await clientAsUserA
      .from("profiles")
      .select("id")
      .eq("id", userBId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("usuário A consegue ler o próprio profile (RLS permite auth.uid() = id)", async () => {
    const clientAsUserA = createUserScopedClient(url, anonKey, userAToken);

    const { data, error } = await clientAsUserA
      .from("profiles")
      .select("id")
      .eq("id", userAId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(userAId);
  });
});
