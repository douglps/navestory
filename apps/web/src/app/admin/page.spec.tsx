import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const searchParamsMock = {
  get: vi.fn(),
  toString: vi.fn().mockReturnValue(""),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsMock,
}));

vi.mock("./admin-users-table", () => ({
  AdminUsersTable: () => <div data-testid="users-table" />,
}));

vi.mock("./admin-audit-logs-table", () => ({
  AdminAuditLogsTable: () => <div data-testid="audit-logs-table" />,
}));

import AdminPage from "./page";

beforeEach(() => {
  pushMock.mockClear();
  searchParamsMock.get.mockReset();
  searchParamsMock.toString.mockReturnValue("");
});

describe("AdminPage", () => {
  it("SPEC-20260731-008 RF-08: exibe título 'Gestão de usuários e auditoria'", () => {
    searchParamsMock.get.mockReturnValue(null);

    render(<AdminPage />);

    expect(screen.getByText("Gestão de usuários e auditoria")).toBeInTheDocument();
  });

  it("SPEC-20260731-008 US-03: exibe AdminUsersTable por padrão (tab=users)", () => {
    searchParamsMock.get.mockReturnValue(null);

    render(<AdminPage />);

    expect(screen.getByTestId("users-table")).toBeInTheDocument();
    expect(screen.queryByTestId("audit-logs-table")).not.toBeInTheDocument();
  });

  it("SPEC-20260731-008 US-04: exibe AdminAuditLogsTable quando tab=audit-logs", () => {
    searchParamsMock.get.mockImplementation((key: string) =>
      key === "tab" ? "audit-logs" : null,
    );

    render(<AdminPage />);

    expect(screen.getByTestId("audit-logs-table")).toBeInTheDocument();
    expect(screen.queryByTestId("users-table")).not.toBeInTheDocument();
  });

  it("SPEC-20260731-008 RF-08: troca para a aba de audit-logs ao clicar na tab", async () => {
    const user = userEvent.setup();
    searchParamsMock.get.mockReturnValue(null);

    render(<AdminPage />);

    await user.click(screen.getByRole("tab", { name: "Audit logs" }));

    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("tab=audit-logs"));
  });

  it("troca para a aba de usuários ao clicar na tab de Usuários", async () => {
    const user = userEvent.setup();
    searchParamsMock.get.mockImplementation((key: string) =>
      key === "tab" ? "audit-logs" : null,
    );

    render(<AdminPage />);

    await user.click(screen.getByRole("tab", { name: "Usuários" }));

    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("tab=users"));
  });
});
