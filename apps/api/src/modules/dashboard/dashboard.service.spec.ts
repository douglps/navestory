import type { ConfigService } from "@nestjs/config";
import { DashboardService } from "./dashboard.service";

jest.mock("../../shared/supabase/create-user-scoped-client", () => ({
  createUserScopedClient: jest.fn(),
}));

import { createUserScopedClient } from "../../shared/supabase/create-user-scoped-client";

describe("DashboardService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `stub-${key}`),
  } as unknown as ConfigService;
  const supabaseAdmin = {} as never;

  function buildTerminalBuilder(result: unknown) {
    const builder: Record<string, unknown> = {};
    builder.select = jest.fn().mockReturnValue(builder);
    builder.eq = jest.fn().mockReturnValue(builder);
    builder.is = jest.fn().mockReturnValue(builder);
    builder.gte = jest.fn().mockReturnValue(builder);
    builder.lte = jest.fn().mockReturnValue(builder);
    builder.order = jest.fn().mockReturnValue(builder);
    builder.limit = jest.fn().mockResolvedValue(result);
    return builder;
  }

  function mockClient(result: unknown) {
    const builder = buildTerminalBuilder(result);
    const client = { from: jest.fn().mockReturnValue(builder) };
    (createUserScopedClient as jest.Mock).mockReturnValue(client);
    return { client, builder };
  }

  function createService() {
    return new DashboardService(supabaseAdmin, configService);
  }

  it("gera CSV com cabeçalho e linhas formatadas (RF-04, CA-02, CA-03)", async () => {
    mockClient({
      data: [
        {
          date: "2026-05-10",
          amount: 150.5,
          category: "fuel",
          description: "Abastecimento",
          vehicles: { plate: "ABC1234", model: "Onix" },
        },
      ],
      error: null,
    });
    const service = createService();

    const csv = await service.exportExpensesCsv("token", "u1", "2026-05", undefined);

    expect(csv).toBe(
      "Data,Placa,Modelo,Categoria,Descricao,Valor\n2026-05-10,ABC1234,Onix,fuel,Abastecimento,150.50\n",
    );
  });

  it("retorna apenas cabeçalho quando não há despesas no período (CA-07)", async () => {
    mockClient({ data: [], error: null });
    const service = createService();

    const csv = await service.exportExpensesCsv("token", "u1", "2026-05", undefined);

    expect(csv).toBe("Data,Placa,Modelo,Categoria,Descricao,Valor\n");
  });

  it("filtra por vehicle_id quando informado (RF-03, CA-06)", async () => {
    const { builder } = mockClient({ data: [], error: null });
    const service = createService();

    await service.exportExpensesCsv("token", "u1", "2026-05", "veh1");

    expect(builder.eq).toHaveBeenCalledWith("vehicle_id", "veh1");
  });

  it("escapa campos com vírgula ou aspas (CA-04)", async () => {
    mockClient({
      data: [
        {
          date: "2026-05-10",
          amount: 10,
          category: "other",
          description: 'Pedágio, "praça 5"',
          vehicles: { plate: "ABC1234", model: "Onix" },
        },
      ],
      error: null,
    });
    const service = createService();

    const csv = await service.exportExpensesCsv("token", "u1", "2026-05", undefined);

    expect(csv).toContain('"Pedágio, ""praça 5"""');
  });
});
