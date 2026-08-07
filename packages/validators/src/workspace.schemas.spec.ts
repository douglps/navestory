import { describe, expect, it } from "vitest";
import {
  assignVehicleInputSchema,
  createInviteInputSchema,
  createWorkspaceInputSchema,
  workspaceInviteSchema,
  workspaceMemberSchema,
  workspaceSchema,
} from "./workspace.schemas";

const UUID = "00000000-0000-0000-0000-000000000000";

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-01
 */
describe("createWorkspaceInputSchema", () => {
  it("aceita nome válido", () => {
    expect(createWorkspaceInputSchema.safeParse({ name: "Minha Frota" }).success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const result = createWorkspaceInputSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    expect(result.success ? null : result.error.issues[0]?.message).toBe("Nome obrigatório");
  });

  it("rejeita nome com mais de 60 caracteres", () => {
    expect(
      createWorkspaceInputSchema.safeParse({ name: "a".repeat(61) }).success,
    ).toBe(false);
  });

  it("remove espaços nas extremidades (trim)", () => {
    const result = createWorkspaceInputSchema.safeParse({ name: "  Frota SP  " });
    expect(result.success && result.data.name).toBe("Frota SP");
  });
});

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-03
 */
describe("createInviteInputSchema", () => {
  it("aceita e-mail válido e normaliza para minúsculas", () => {
    const result = createInviteInputSchema.safeParse({ email: "Motorista@Exemplo.com" });
    expect(result.success && result.data.email).toBe("motorista@exemplo.com");
  });

  it("rejeita e-mail inválido", () => {
    const result = createInviteInputSchema.safeParse({ email: "não-é-email" });
    expect(result.success).toBe(false);
    expect(result.success ? null : result.error.issues[0]?.message).toBe("E-mail inválido");
  });
});

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-08
 */
describe("assignVehicleInputSchema", () => {
  it("aceita memberId válido", () => {
    expect(assignVehicleInputSchema.safeParse({ memberId: UUID }).success).toBe(true);
  });

  it("rejeita memberId que não é uuid", () => {
    expect(assignVehicleInputSchema.safeParse({ memberId: "não-é-uuid" }).success).toBe(false);
  });
});

describe("workspaceSchema", () => {
  it("aceita workspace sem role (campo opcional)", () => {
    const result = workspaceSchema.safeParse({
      id: UUID,
      owner_id: UUID,
      name: "Frota SP",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("aceita workspace com role informada", () => {
    const result = workspaceSchema.safeParse({
      id: UUID,
      owner_id: UUID,
      name: "Frota SP",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
      role: "workspace_member",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita role fora do enum", () => {
    const result = workspaceSchema.safeParse({
      id: UUID,
      owner_id: UUID,
      name: "Frota SP",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });
});

describe("workspaceMemberSchema", () => {
  it("aceita membro com email/name/removed_at nulos", () => {
    const result = workspaceMemberSchema.safeParse({
      id: UUID,
      workspace_id: UUID,
      user_id: UUID,
      email: null,
      name: null,
      joined_at: "2026-08-01T00:00:00Z",
      removed_at: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("workspaceInviteSchema", () => {
  it("aceita convite sem inviteUrl (campo opcional)", () => {
    const result = workspaceInviteSchema.safeParse({
      id: UUID,
      email: "motorista@exemplo.com",
      status: "pending",
      expires_at: "2026-08-10T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("aceita convite com inviteUrl válida", () => {
    const result = workspaceInviteSchema.safeParse({
      id: UUID,
      email: "motorista@exemplo.com",
      status: "accepted",
      expires_at: "2026-08-10T00:00:00Z",
      inviteUrl: "https://navestory.com/workspace/invite/abc",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita status fora do enum", () => {
    const result = workspaceInviteSchema.safeParse({
      id: UUID,
      email: "motorista@exemplo.com",
      status: "invalido",
      expires_at: "2026-08-10T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});
