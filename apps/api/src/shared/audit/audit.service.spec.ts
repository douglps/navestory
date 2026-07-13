import { AuditService } from "./audit.service";

function createSupabaseMock(result: { error: unknown }) {
  const insert = jest.fn().mockResolvedValue(result);
  return { from: jest.fn().mockReturnValue({ insert }), insert };
}

describe("AuditService", () => {
  it("insere o log de auditoria com os campos corretos (RF-SEC-002)", async () => {
    const supabase = createSupabaseMock({ error: null });
    const service = new AuditService(supabase as never);

    await service.log({
      userId: "u1",
      action: "LOGIN",
      tableName: "auth",
      recordId: "u1",
    });

    expect(supabase.from).toHaveBeenCalledWith("audit_logs");
    expect(supabase.insert).toHaveBeenCalledWith({
      user_id: "u1",
      action: "LOGIN",
      table_name: "auth",
      record_id: "u1",
      changes: {},
    });
  });

  it("nunca propaga exceção quando o insert falha (fire-and-forget, R-MON-01)", async () => {
    const supabase = createSupabaseMock({ error: { message: "erro de banco" } });
    const service = new AuditService(supabase as never);

    await expect(
      service.log({ userId: "u1", action: "LOGIN", tableName: "auth", recordId: "u1" }),
    ).resolves.toBeUndefined();
  });

  it("nunca propaga exceção quando o client lança erro síncrono/assíncrono", async () => {
    const supabase = { from: jest.fn().mockImplementation(() => { throw new Error("boom"); }) };
    const service = new AuditService(supabase as never);

    await expect(
      service.log({ userId: "u1", action: "LOGIN", tableName: "auth", recordId: "u1" }),
    ).resolves.toBeUndefined();
  });
});
