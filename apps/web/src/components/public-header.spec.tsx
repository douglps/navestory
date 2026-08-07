import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicHeader } from "./public-header";

const setThemeMock = vi.fn();
const resolvedThemeMock = vi.fn<() => string | undefined>(() => undefined);

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: resolvedThemeMock(), setTheme: setThemeMock }),
}));

describe("PublicHeader", () => {
  afterEach(() => {
    setThemeMock.mockClear();
    resolvedThemeMock.mockReturnValue(undefined);
  });

  it("RF-01: exibe o logo navestory", () => {
    render(<PublicHeader /> as ReactNode);

    expect(screen.getByRole("link", { name: "navestory" })).toHaveAttribute("href", "/");
  });

  it("RF-02: sem navLink, não exibe link de navegação adicional", () => {
    render(<PublicHeader /> as ReactNode);

    expect(screen.queryAllByRole("link")).toHaveLength(1);
  });

  it("RF-02: com navLink, exibe o link com label e href informados", () => {
    render(
      <PublicHeader navLink={{ label: "Entrar", href: "/login" }} /> as ReactNode,
    );

    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
  });

  // @spec SPEC-20260731-004 RF-13
  it("RF-13: tema claro (ou indefinido) — clicar no toggle chama setTheme('dark')", async () => {
    const user = userEvent.setup();
    render(<PublicHeader /> as ReactNode);

    const toggleBtn = await screen.findByRole("button", { name: /Ativar modo/ });
    await user.click(toggleBtn);

    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  // @spec SPEC-20260731-004 RF-13
  it("RF-13: tema escuro — clicar no toggle chama setTheme('light')", async () => {
    resolvedThemeMock.mockReturnValue("dark");
    const user = userEvent.setup();
    render(<PublicHeader /> as ReactNode);

    const toggleBtn = await screen.findByRole("button", { name: /Ativar modo/ });
    await user.click(toggleBtn);

    expect(setThemeMock).toHaveBeenCalledWith("light");
  });
});
