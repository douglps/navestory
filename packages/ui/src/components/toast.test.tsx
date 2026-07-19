import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { ToastViewport, type ToastItem } from "./toast";

describe("ToastViewport", () => {
  it("não renderiza nada com a fila vazia", () => {
    const { container } = render(<ToastViewport toasts={[]} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza cada item da fila com título e descrição", () => {
    const toasts: ToastItem[] = [
      { id: "1", variant: "success", title: "Despesa registrada", description: "R$ 180,00" },
    ];
    render(<ToastViewport toasts={toasts} onDismiss={vi.fn()} />);

    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Despesa registrada");
    expect(toast).toHaveTextContent("R$ 180,00");
  });

  it("dispara onDismiss ao clicar em fechar", async () => {
    const onDismiss = vi.fn();
    const toasts: ToastItem[] = [{ id: "1", title: "Contexto limpo" }];
    render(<ToastViewport toasts={toasts} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(onDismiss).toHaveBeenCalledWith("1");
  });

  it("some sozinho após `duration` (padrão 4000ms)", () => {
    vi.useFakeTimers();
    try {
      const onDismiss = vi.fn();
      const toasts: ToastItem[] = [{ id: "1", title: "Salvo" }];
      render(<ToastViewport toasts={toasts} onDismiss={onDismiss} />);

      vi.advanceTimersByTime(4000);
      expect(onDismiss).toHaveBeenCalledWith("1");
    } finally {
      vi.useRealTimers();
    }
  });

  it("duration=0 não dispara auto-dismiss (persistente)", () => {
    vi.useFakeTimers();
    try {
      const onDismiss = vi.fn();
      const toasts: ToastItem[] = [{ id: "1", title: "Nova versão disponível.", duration: 0 }];
      render(<ToastViewport toasts={toasts} onDismiss={onDismiss} />);

      vi.advanceTimersByTime(60_000);
      expect(onDismiss).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("persistente com ação não mostra botão de fechar, só a ação", async () => {
    const onClick = vi.fn();
    const toasts: ToastItem[] = [
      {
        id: "1",
        title: "Nova versão disponível.",
        duration: 0,
        action: { label: "Recarregar", onClick },
      },
    ];
    render(<ToastViewport toasts={toasts} onDismiss={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Fechar aviso" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Recarregar" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("empilha múltiplos toasts simultaneamente", () => {
    const toasts: ToastItem[] = [
      { id: "1", title: "Primeiro" },
      { id: "2", title: "Segundo" },
    ];
    render(<ToastViewport toasts={toasts} onDismiss={vi.fn()} />);

    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it.each(["default", "info", "success", "warning", "error"] as const)(
    "não tem violações de acessibilidade na variante %s",
    async (variant) => {
      const toasts: ToastItem[] = [
        {
          id: "1",
          variant,
          title: "Título",
          description: "Descrição do toast.",
          action: { label: "Ação", onClick: () => {} },
        },
      ];
      const { container } = render(<ToastViewport toasts={toasts} onDismiss={vi.fn()} />);
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
