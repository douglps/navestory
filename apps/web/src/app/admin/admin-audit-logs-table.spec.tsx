import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const searchParamsMock = {
  get: vi.fn(),
  toString: vi.fn().mockReturnValue(""),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsMock,
}));

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";
import { AdminAuditLogsTable } from "./admin-audit-logs-table";

function renderTable() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AdminAuditLogsTable />
    </QueryClientProvider> as ReactNode,
  );
}

const mockLogs = [
  {
    id: "log-1",
    action: "INSERT",
    table_name: "vehicles",
    record_id: "v-abc",
    user_id: "user-123",
    created_at: "2026-07-31T10:00:00.000Z",
  },
];

beforeEach(() => {
  pushMock.mockClear();
  searchParamsMock.get.mockReset();
  searchParamsMock.get.mockReturnValue(null);
  searchParamsMock.toString.mockReturnValue("");
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminAuditLogsTable", () => {
  it("SPEC-20260731-008 RF-15: exibe Skeleton enquanto carrega", () => {
    vi.mocked(apiClient).mockImplementation(() => new Promise(() => {}));

    const { container } = renderTable();

    const skeletons = container.querySelectorAll("[class*='animate-pulse'], [class*='skeleton'], .h-10");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("SPEC-20260731-008 RF-16: exibe mensagem de estado vazio quando não há logs", async () => {
    vi.mocked(apiClient).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20 } });

    renderTable();

    await waitFor(() => {
      expect(screen.getByText(/Nenhum audit log encontrado/)).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-12: exibe mensagem de erro quando a busca falha", async () => {
    vi.mocked(apiClient).mockRejectedValue(new Error("Falha"));

    renderTable();

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível carregar os audit logs/)).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-12: renderiza colunas da tabela quando há logs", async () => {
    vi.mocked(apiClient).mockResolvedValue({
      data: mockLogs,
      meta: { total: 1, page: 1, limit: 20 },
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("INSERT")).toBeInTheDocument();
      expect(screen.getByText("vehicles")).toBeInTheDocument();
      expect(screen.getByText("v-abc")).toBeInTheDocument();
      expect(screen.getByText("user-123")).toBeInTheDocument();
    });
  });

  it("exibe '—' quando user_id é null", async () => {
    vi.mocked(apiClient).mockResolvedValue({
      data: [{ ...mockLogs[0], user_id: null }],
      meta: { total: 1, page: 1, limit: 20 },
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-12: submete filtro de user_id atualizando a URL", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockResolvedValue({
      data: mockLogs,
      meta: { total: 1, page: 1, limit: 20 },
    });

    renderTable();

    const input = await screen.findByPlaceholderText("uuid do usuário");
    await user.type(input, "abc-def");
    await user.click(screen.getByRole("button", { name: "Filtrar" }));

    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("user_id=abc-def"));
  });

  it("SPEC-20260731-008 RF-12: botão 'Anterior' está desabilitado na primeira página", async () => {
    searchParamsMock.get.mockImplementation((key: string) =>
      key === "page" ? "1" : null,
    );
    vi.mocked(apiClient).mockResolvedValue({
      data: mockLogs,
      meta: { total: 1, page: 1, limit: 20 },
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    });
  });

  it("SPEC-20260731-008 RF-12: botão 'Próxima' está desabilitado quando não há mais páginas", async () => {
    vi.mocked(apiClient).mockResolvedValue({
      data: mockLogs,
      meta: { total: 1, page: 1, limit: 20 },
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
    });
  });

  it("SPEC-20260731-008 RF-12: botão 'Próxima' navega para a próxima página", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockResolvedValue({
      data: Array.from({ length: 20 }, (_, i) => ({ ...mockLogs[0], id: `log-${i}` })),
      meta: { total: 40, page: 1, limit: 20 },
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Próxima" })).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: "Próxima" }));

    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });

  it("exibe contagem de registros no rodapé", async () => {
    vi.mocked(apiClient).mockResolvedValue({
      data: mockLogs,
      meta: { total: 1, page: 1, limit: 20 },
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByText(/1 registro/)).toBeInTheDocument();
    });
  });

  it("exibe 'registros' no plural quando há mais de um log", async () => {
    vi.mocked(apiClient).mockResolvedValue({
      data: [mockLogs[0], { ...mockLogs[0], id: "log-2" }],
      meta: { total: 2, page: 1, limit: 20 },
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByText(/2 registros/)).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-12: popula dateRange quando searchParams tem 'from' e 'to'", async () => {
    searchParamsMock.get.mockImplementation((key: string) => {
      if (key === "from") return "2026-07-01T00:00:00.000Z";
      if (key === "to") return "2026-07-31T23:59:59.000Z";
      return null;
    });
    searchParamsMock.toString.mockReturnValue("from=2026-07-01T00:00:00.000Z&to=2026-07-31T23:59:59.000Z");
    vi.mocked(apiClient).mockResolvedValue({
      data: mockLogs,
      meta: { total: 1, page: 1, limit: 20 },
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("INSERT")).toBeInTheDocument();
    });

    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining("from=2026-07-01"),
    );
  });

  it("SPEC-20260731-008 RF-12: botão 'Anterior' navega para a página anterior quando habilitado", async () => {
    const user = userEvent.setup();
    searchParamsMock.get.mockImplementation((key: string) =>
      key === "page" ? "2" : null,
    );
    vi.mocked(apiClient).mockResolvedValue({
      data: mockLogs,
      meta: { total: 25, page: 2, limit: 20 },
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Anterior" })).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: "Anterior" }));

    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("page=1"));
  });
});
