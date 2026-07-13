import { extractUserId } from "./user-id.decorator";

describe("extractUserId", () => {
  it("retorna o sub do usuário autenticado", () => {
    expect(extractUserId({ user: { sub: "user-1" } } as never)).toBe("user-1");
  });

  it("lança erro quando não há usuário no request (rota não protegida por SupabaseAuthGuard)", () => {
    expect(() => extractUserId({} as never)).toThrow(/SupabaseAuthGuard/);
  });
});
