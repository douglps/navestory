import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette, type CommandPaletteItem } from "./command-palette";

const items: CommandPaletteItem[] = [
  { id: "v1", category: "Veículos", label: "ABC-1234", onSelect: vi.fn() },
  { id: "e1", category: "Despesas", label: "Combustível", onSelect: vi.fn() },
];

describe("CommandPalette", () => {
  it("não renderiza a lista quando fechado", () => {
    render(
      <CommandPalette open={false} onOpenChange={vi.fn()} items={items} query="" onQueryChange={vi.fn()} />,
    );
    expect(screen.queryByText("ABC-1234")).not.toBeInTheDocument();
  });

  it("agrupa itens por categoria e exibe cada um quando aberto", () => {
    render(
      <CommandPalette open onOpenChange={vi.fn()} items={items} query="" onQueryChange={vi.fn()} />,
    );
    expect(screen.getByText("Veículos")).toBeInTheDocument();
    expect(screen.getByText("Despesas")).toBeInTheDocument();
    expect(screen.getByText("ABC-1234")).toBeInTheDocument();
    expect(screen.getByText("Combustível")).toBeInTheDocument();
  });

  it("chama onSelect do item e fecha ao selecionar", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        items={[{ id: "v1", category: "Veículos", label: "ABC-1234", onSelect }]}
        query=""
        onQueryChange={vi.fn()}
      />,
    );

    await user.click(screen.getByText("ABC-1234"));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('exibe mensagem "Nenhum resultado para X" quando a lista de items está vazia com query', () => {
    render(
      <CommandPalette open onOpenChange={vi.fn()} items={[]} query="xyz" onQueryChange={vi.fn()} />,
    );
    expect(screen.getByText('Nenhum resultado para "xyz"')).toBeInTheDocument();
  });

  it("chama onQueryChange ao digitar no input", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    render(
      <CommandPalette open onOpenChange={vi.fn()} items={[]} query="" onQueryChange={onQueryChange} />,
    );

    await user.type(screen.getByPlaceholderText(/Buscar veículos/), "a");
    expect(onQueryChange).toHaveBeenCalled();
  });
});
