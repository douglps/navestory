import { NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { VehicleGroupsService } from "./vehicle-groups.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("VehicleGroupsService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;
  const supabaseAdmin = {} as never;

  function createService() {
    return new VehicleGroupsService(supabaseAdmin, configService);
  }

  function mockClient(from: Record<string, jest.Mock>) {
    const tables = new Map(Object.entries(from));
    const client = { from: jest.fn().mockImplementation((table: string) => tables.get(table)) };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    return client;
  }

  it("create persiste o grupo com o user_id do dono (RF-01, RF-02, CA-01)", async () => {
    const builder: Record<string, unknown> = {};
    builder.insert = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue({
      data: { id: "g1", user_id: "u1", name: "Motos", color: "#ef4444" },
      error: null,
    });
    mockClient({ vehicle_groups: builder as never });
    const service = createService();

    const group = await service.create("token", "u1", { name: "Motos", color: "#ef4444" });

    expect(group).toEqual({ id: "g1", user_id: "u1", name: "Motos", color: "#ef4444" });
    expect(builder.insert).toHaveBeenCalledWith({ name: "Motos", color: "#ef4444", user_id: "u1" });
  });

  it("findAll retorna grupos com contagem de membros, limitado a 100 (RF-08, SPEC-20260603-001 RF-18)", async () => {
    const groupsBuilder: Record<string, unknown> = {};
    groupsBuilder.select = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.eq = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.order = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.limit = jest.fn().mockResolvedValue({
      data: [
        {
          id: "g1",
          name: "Motos",
          vehicle_group_members: [{ vehicle_id: "v1" }, { vehicle_id: "v2" }, { vehicle_id: "v3" }],
        },
        { id: "g2", name: "Frota SP", vehicle_group_members: [] },
      ],
      error: null,
    });

    const vehiclesBuilder: Record<string, unknown> = {};
    vehiclesBuilder.select = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.eq = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.is = jest.fn().mockResolvedValue({
      data: [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
      error: null,
    });

    mockClient({ vehicle_groups: groupsBuilder as never, vehicles: vehiclesBuilder as never });
    const service = createService();

    const groups = await service.findAll("token", "u1");

    expect(groupsBuilder.limit).toHaveBeenCalledWith(100);
    expect(groups[0]?.member_count).toBe(3);
    expect(groups[1]?.member_count).toBe(0);
  });

  it("findAll exclui do member_count veículos soft-deletados (SPEC-20260603-001 RF-19, R-GRP-03)", async () => {
    const groupsBuilder: Record<string, unknown> = {};
    groupsBuilder.select = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.eq = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.order = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.limit = jest.fn().mockResolvedValue({
      data: [
        {
          id: "g1",
          name: "Motos",
          // v2 pertence ao grupo mas foi soft-deletado — não deve contar.
          vehicle_group_members: [{ vehicle_id: "v1" }, { vehicle_id: "v2" }],
        },
      ],
      error: null,
    });

    const vehiclesBuilder: Record<string, unknown> = {};
    vehiclesBuilder.select = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.eq = jest.fn().mockReturnValue(vehiclesBuilder);
    // apenas v1 está ativo (v2 tem deleted_at preenchido, filtrado por `.is`).
    vehiclesBuilder.is = jest.fn().mockResolvedValue({ data: [{ id: "v1" }], error: null });

    mockClient({ vehicle_groups: groupsBuilder as never, vehicles: vehiclesBuilder as never });
    const service = createService();

    const groups = await service.findAll("token", "u1");

    expect(groups[0]?.member_count).toBe(1);
  });

  it("update lança 404 quando o grupo não pertence ao usuário (CA-08)", async () => {
    const builder: Record<string, unknown> = {};
    builder.update = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockClient({ vehicle_groups: builder as never });
    const service = createService();

    await expect(
      service.update("token", "other-user", "g1", { name: "Frota SP" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("remove lança 404 quando o grupo não existe (CA-07)", async () => {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockClient({ vehicle_groups: builder as never });
    const service = createService();

    await expect(service.remove("token", "u1", "g1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("remove executa hard-delete quando o grupo pertence ao usuário", async () => {
    const groupBuilder: Record<string, unknown> = {};
    groupBuilder.select = jest.fn().mockReturnValue(groupBuilder);
    let eqCalls = 0;
    groupBuilder.eq = jest.fn().mockImplementation(() => {
      eqCalls += 1;
      return eqCalls < 2 ? groupBuilder : groupBuilder;
    });
    groupBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "g1" }, error: null });
    groupBuilder.delete = jest.fn().mockReturnValue(groupBuilder);
    mockClient({ vehicle_groups: groupBuilder as never });
    const service = createService();

    await expect(service.remove("token", "u1", "g1")).resolves.toBeUndefined();
    expect(groupBuilder.delete).toHaveBeenCalled();
  });

  it("setMembers lança 404 quando o grupo não pertence ao usuário", async () => {
    const groupBuilder: Record<string, unknown> = {};
    groupBuilder.select = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.eq = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockClient({ vehicle_groups: groupBuilder as never });
    const service = createService();

    await expect(
      service.setMembers("token", "other-user", "g1", { vehicleIds: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("setMembers descarta veículos que não pertencem ao usuário ou estão soft-deletados (RF-07, CA-05, CA-06)", async () => {
    const groupBuilder: Record<string, unknown> = {};
    groupBuilder.select = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.eq = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "g1" }, error: null });

    const vehiclesBuilder: Record<string, unknown> = {};
    vehiclesBuilder.select = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.in = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.eq = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.is = jest.fn().mockResolvedValue({ data: [{ id: "v1" }], error: null });

    const membersBuilder: Record<string, unknown> = {};
    membersBuilder.delete = jest.fn().mockReturnValue(membersBuilder);
    membersBuilder.eq = jest.fn().mockResolvedValue({ error: null });
    membersBuilder.insert = jest.fn().mockResolvedValue({ error: null });

    mockClient({
      vehicle_groups: groupBuilder as never,
      vehicles: vehiclesBuilder as never,
      vehicle_group_members: membersBuilder as never,
    });
    const service = createService();

    const result = await service.setMembers("token", "u1", "g1", {
      vehicleIds: ["v1", "v2-de-outro-usuario"],
    });

    expect(result.vehicleIds).toEqual(["v1"]);
    expect(membersBuilder.insert).toHaveBeenCalledWith([{ group_id: "g1", vehicle_id: "v1" }]);
  });

  it("create lança 404 quando o insert falha", async () => {
    const builder: Record<string, unknown> = {};
    builder.insert = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.single = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    mockClient({ vehicle_groups: builder as never });
    const service = createService();

    await expect(
      service.create("token", "u1", { name: "Motos", color: "#ef4444" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("findAll lança 404 quando a query de grupos falha", async () => {
    const groupsBuilder: Record<string, unknown> = {};
    groupsBuilder.select = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.eq = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.order = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.limit = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });

    const vehiclesBuilder: Record<string, unknown> = {};
    vehiclesBuilder.select = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.eq = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.is = jest.fn().mockResolvedValue({ data: [], error: null });

    mockClient({ vehicle_groups: groupsBuilder as never, vehicles: vehiclesBuilder as never });
    const service = createService();

    await expect(service.findAll("token", "u1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("findAll lança 404 quando a validação de veículos ativos falha", async () => {
    const groupsBuilder: Record<string, unknown> = {};
    groupsBuilder.select = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.eq = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.order = jest.fn().mockReturnValue(groupsBuilder);
    groupsBuilder.limit = jest.fn().mockResolvedValue({ data: [], error: null });

    const vehiclesBuilder: Record<string, unknown> = {};
    vehiclesBuilder.select = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.eq = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.is = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });

    mockClient({ vehicle_groups: groupsBuilder as never, vehicles: vehiclesBuilder as never });
    const service = createService();

    await expect(service.findAll("token", "u1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("update lança 404 quando a query de update falha", async () => {
    const builder: Record<string, unknown> = {};
    builder.update = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.select = jest.fn().mockReturnValue(builder);
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    mockClient({ vehicle_groups: builder as never });
    const service = createService();

    await expect(
      service.update("token", "u1", "g1", { name: "Frota SP" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("remove lança 404 quando o hard-delete falha", async () => {
    const groupBuilder: Record<string, unknown> = {};
    groupBuilder.select = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "g1" }, error: null });
    groupBuilder.delete = jest.fn().mockReturnValue(groupBuilder);
    let eqCalls = 0;
    groupBuilder.eq = jest.fn().mockImplementation(() => {
      eqCalls += 1;
      // 1ª e 2ª chamadas: select().eq().eq() (busca do grupo existente).
      // 3ª e 4ª chamadas: delete().eq().eq() — a 4ª (última) resolve o await final.
      return eqCalls === 4 ? { error: { message: "boom" } } : groupBuilder;
    });
    mockClient({ vehicle_groups: groupBuilder as never });
    const service = createService();

    await expect(service.remove("token", "u1", "g1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("setMembers lança 404 quando a validação de veículos informados falha", async () => {
    const groupBuilder: Record<string, unknown> = {};
    groupBuilder.select = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.eq = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "g1" }, error: null });

    const vehiclesBuilder: Record<string, unknown> = {};
    vehiclesBuilder.select = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.in = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.eq = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.is = jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } });

    mockClient({ vehicle_groups: groupBuilder as never, vehicles: vehiclesBuilder as never });
    const service = createService();

    await expect(
      service.setMembers("token", "u1", "g1", { vehicleIds: ["v1"] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("setMembers lança 404 quando a limpeza dos membros atuais falha", async () => {
    const groupBuilder: Record<string, unknown> = {};
    groupBuilder.select = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.eq = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "g1" }, error: null });

    const membersBuilder: Record<string, unknown> = {};
    membersBuilder.delete = jest.fn().mockReturnValue(membersBuilder);
    membersBuilder.eq = jest.fn().mockResolvedValue({ error: { message: "boom" } });
    membersBuilder.insert = jest.fn();

    mockClient({ vehicle_groups: groupBuilder as never, vehicle_group_members: membersBuilder as never });
    const service = createService();

    await expect(
      service.setMembers("token", "u1", "g1", { vehicleIds: [] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("setMembers lança 404 quando a inserção dos novos membros falha", async () => {
    const groupBuilder: Record<string, unknown> = {};
    groupBuilder.select = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.eq = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "g1" }, error: null });

    const vehiclesBuilder: Record<string, unknown> = {};
    vehiclesBuilder.select = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.in = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.eq = jest.fn().mockReturnValue(vehiclesBuilder);
    vehiclesBuilder.is = jest.fn().mockResolvedValue({ data: [{ id: "v1" }], error: null });

    const membersBuilder: Record<string, unknown> = {};
    membersBuilder.delete = jest.fn().mockReturnValue(membersBuilder);
    membersBuilder.eq = jest.fn().mockResolvedValue({ error: null });
    membersBuilder.insert = jest.fn().mockResolvedValue({ error: { message: "boom" } });

    mockClient({
      vehicle_groups: groupBuilder as never,
      vehicles: vehiclesBuilder as never,
      vehicle_group_members: membersBuilder as never,
    });
    const service = createService();

    await expect(
      service.setMembers("token", "u1", "g1", { vehicleIds: ["v1"] }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("setMembers com lista vazia limpa os membros sem inserir (R-GRP-02)", async () => {
    const groupBuilder: Record<string, unknown> = {};
    groupBuilder.select = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.eq = jest.fn().mockReturnValue(groupBuilder);
    groupBuilder.maybeSingle = jest.fn().mockResolvedValue({ data: { id: "g1" }, error: null });

    const membersBuilder: Record<string, unknown> = {};
    membersBuilder.delete = jest.fn().mockReturnValue(membersBuilder);
    membersBuilder.eq = jest.fn().mockResolvedValue({ error: null });
    membersBuilder.insert = jest.fn();

    mockClient({ vehicle_groups: groupBuilder as never, vehicle_group_members: membersBuilder as never });
    const service = createService();

    const result = await service.setMembers("token", "u1", "g1", { vehicleIds: [] });

    expect(result.vehicleIds).toEqual([]);
    expect(membersBuilder.insert).not.toHaveBeenCalled();
  });
});
