import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AvatarDropdown } from "./avatar-dropdown";

/**
 * @spec SPEC-20260730-002 RF-04, RF-05, RNF-04
 */
describe("AvatarDropdown", () => {
  it("exibe as iniciais do nome (primeira e última palavra) no trigger", () => {
    render(<AvatarDropdown name="Douglas Lopes" email="d@x.com" onLogout={() => {}} />);

    expect(screen.getByRole("button", { name: "Menu do usuário" })).toHaveTextContent("DL");
  });

  it("nome de uma palavra só: usa apenas a primeira letra", () => {
    render(<AvatarDropdown name="Douglas" email="d@x.com" onLogout={() => {}} />);

    expect(screen.getByRole("button", { name: "Menu do usuário" })).toHaveTextContent("D");
  });

  it("nome vazio: exibe '?' como fallback", () => {
    render(<AvatarDropdown name="   " email="d@x.com" onLogout={() => {}} />);

    expect(screen.getByRole("button", { name: "Menu do usuário" })).toHaveTextContent("?");
  });

  it("abre o popover ao clicar e exibe nome, email e link de configurações", async () => {
    const user = userEvent.setup();
    render(<AvatarDropdown name="Douglas Lopes" email="d@x.com" onLogout={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Menu do usuário" }));

    expect(await screen.findByText("Douglas Lopes")).toBeInTheDocument();
    expect(screen.getByText("d@x.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Configurações da conta" })).toHaveAttribute(
      "href",
      "/settings/account",
    );
  });

  it("sem email: exibe travessão como fallback", async () => {
    const user = userEvent.setup();
    render(<AvatarDropdown name="Douglas Lopes" email={null} onLogout={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Menu do usuário" }));

    expect(await screen.findByText("—")).toBeInTheDocument();
  });

  it("aceita accountHref customizado", async () => {
    const user = userEvent.setup();
    render(
      <AvatarDropdown
        name="Douglas"
        email="d@x.com"
        accountHref="/workspace/settings"
        onLogout={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Menu do usuário" }));

    expect(await screen.findByRole("link", { name: "Configurações da conta" })).toHaveAttribute(
      "href",
      "/workspace/settings",
    );
  });

  it("clicar em 'Sair' chama onLogout", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<AvatarDropdown name="Douglas Lopes" email="d@x.com" onLogout={onLogout} />);

    await user.click(screen.getByRole("button", { name: "Menu do usuário" }));
    await user.click(await screen.findByRole("button", { name: "Sair" }));

    expect(onLogout).toHaveBeenCalledOnce();
  });
});
