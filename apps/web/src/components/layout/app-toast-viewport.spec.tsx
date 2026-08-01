import { render } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { useUIStore } from "@/lib/stores/ui-store";
import { AppToastViewport } from "./app-toast-viewport";

describe("AppToastViewport", () => {
  it("renderiza sem erros com a fila de toasts vazia", () => {
    act(() => useUIStore.setState({ toasts: [] }));
    expect(() => render(<AppToastViewport />)).not.toThrow();
  });

  it("renderiza toasts presentes no ui-store", () => {
    act(() =>
      useUIStore.setState({
        toasts: [
          { id: "t1", variant: "success", title: "Salvo com sucesso", duration: 3000 },
        ],
      }),
    );

    const { container } = render(<AppToastViewport />);

    expect(container.textContent).toContain("Salvo com sucesso");

    act(() => useUIStore.setState({ toasts: [] }));
  });

  it("delega onDismiss para dismissToast do ui-store", () => {
    act(() =>
      useUIStore.setState({
        toasts: [{ id: "t2", variant: "info", title: "Informação", duration: 3000 }],
      }),
    );

    render(<AppToastViewport />);

    act(() => {
      useUIStore.getState().dismissToast("t2");
    });

    expect(useUIStore.getState().toasts).toHaveLength(0);
  });
});
