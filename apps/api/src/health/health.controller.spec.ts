import type { SupabaseClient } from "@supabase/supabase-js";
import { HealthController } from "./health.controller";

function createSupabaseAdminMock(queryResult: PromiseLike<{ error: unknown }>): SupabaseClient {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue(queryResult),
    }),
  } as unknown as SupabaseClient;
}

// @spec SPEC-20260716-002 RF-14 a RF-20
describe("HealthController", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("CA-06: retorna status ok quando Supabase responde sem erro", async () => {
    const controller = new HealthController(createSupabaseAdminMock(Promise.resolve({ error: null })));

    const result = await controller.check();

    expect(result.status).toBe("ok");
    expect(result.checks.supabase).toEqual({ status: "ok", latencyMs: expect.any(Number) });
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it("CA-07: retorna status degraded (não down) quando a query ao Supabase falha", async () => {
    const controller = new HealthController(
      createSupabaseAdminMock(Promise.resolve({ error: new Error("relation profiles does not exist") })),
    );

    const result = await controller.check();

    expect(result.status).toBe("degraded");
    expect(result.checks.supabase).toEqual({
      status: "error",
      latencyMs: expect.any(Number),
      error: "query_failed",
    });
  });

  it("RF-18/S5: nunca expõe a mensagem de erro bruta do banco", async () => {
    const controller = new HealthController(
      createSupabaseAdminMock(Promise.resolve({ error: new Error("senha do banco: hunter2") })),
    );

    const result = await controller.check();

    expect(JSON.stringify(result)).not.toContain("hunter2");
  });

  it("RF-17: retorna connection_timeout quando o Supabase excede 3s", async () => {
    jest.useFakeTimers();
    const neverResolves = new Promise<{ error: unknown }>(() => {});
    const controller = new HealthController(createSupabaseAdminMock(neverResolves));

    const resultPromise = controller.check();
    await jest.advanceTimersByTimeAsync(3000);
    const result = await resultPromise;

    expect(result.status).toBe("degraded");
    expect(result.checks.supabase.error).toBe("connection_timeout");
  });
});
