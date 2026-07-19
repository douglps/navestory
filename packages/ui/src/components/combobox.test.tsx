import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { Combobox, type ComboboxOption } from "./combobox";

const VEHICLE_OPTIONS: ComboboxOption[] = [
  { value: "1", label: "ABC-1234", description: "Gol 2019" },
  { value: "2", label: "DEF-5678", description: "HB20 2021" },
  { value: "3", label: "GHI-9012", description: "Strada 2022" },
];

describe("Combobox", () => {
  it("exibe o placeholder quando não há valor selecionado", () => {
    render(<Combobox options={VEHICLE_OPTIONS} onValueChange={() => {}} placeholder="Selecionar veículo" />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Selecionar veículo");
  });

  it("exibe o label da opção selecionada", () => {
    render(<Combobox options={VEHICLE_OPTIONS} value="2" onValueChange={() => {}} />);

    expect(screen.getByRole("combobox")).toHaveTextContent("DEF-5678");
  });

  it("abre a lista de opções ao clicar no trigger", async () => {
    const user = userEvent.setup();
    render(<Combobox options={VEHICLE_OPTIONS} onValueChange={() => {}} />);

    await user.click(screen.getByRole("combobox"));

    expect(await screen.findByText("ABC-1234")).toBeInTheDocument();
    expect(screen.getByText("DEF-5678")).toBeInTheDocument();
  });

  it("filtra as opções por texto digitado na busca (client-side, sem rede)", async () => {
    const user = userEvent.setup();
    render(<Combobox options={VEHICLE_OPTIONS} onValueChange={() => {}} searchPlaceholder="Buscar por placa..." />);

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Buscar por placa..."), "ABC");

    await waitFor(() => {
      expect(screen.getByText("ABC-1234")).toBeInTheDocument();
      expect(screen.queryByText("DEF-5678")).not.toBeInTheDocument();
    });
  });

  it("exibe emptyMessage quando a busca não encontra nenhuma opção", async () => {
    const user = userEvent.setup();
    render(<Combobox options={VEHICLE_OPTIONS} onValueChange={() => {}} emptyMessage="Nenhum veículo encontrado" />);

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Buscar..."), "zzz-inexistente");

    expect(await screen.findByText("Nenhum veículo encontrado")).toBeInTheDocument();
  });

  it("chama onValueChange e fecha a lista ao selecionar uma opção", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Combobox options={VEHICLE_OPTIONS} onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("ABC-1234"));

    expect(onValueChange).toHaveBeenCalledWith("1");
    await waitFor(() => expect(screen.queryByText("Gol 2019")).not.toBeInTheDocument());
  });

  it("fica desabilitado quando disabled ou loading", () => {
    const { rerender } = render(<Combobox options={VEHICLE_OPTIONS} onValueChange={() => {}} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();

    rerender(<Combobox options={VEHICLE_OPTIONS} onValueChange={() => {}} loading />);
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("combobox")).toHaveTextContent("Carregando...");
  });

  it("exibe mensagem de erro e marca aria-invalid", () => {
    render(<Combobox options={VEHICLE_OPTIONS} onValueChange={() => {}} error="Selecione um veículo" />);

    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Selecione um veículo")).toBeInTheDocument();
  });

  it("não tem violações de acessibilidade fechado", async () => {
    const { container } = render(
      <Combobox options={VEHICLE_OPTIONS} onValueChange={() => {}} aria-label="Selecionar veículo" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("não tem violações de acessibilidade aberto", async () => {
    const user = userEvent.setup();
    render(<Combobox options={VEHICLE_OPTIONS} onValueChange={() => {}} aria-label="Selecionar veículo" />);
    await user.click(screen.getByRole("combobox"));
    await screen.findByText("ABC-1234");

    // Popover.Content renderiza via portal em document.body — fora do container de render().
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(await axe(dialog)).toHaveNoViolations();
  });
});
