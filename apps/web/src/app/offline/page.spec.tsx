import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/public-header", () => ({
  PublicHeader: () => <header data-testid="public-header" />,
}));

vi.mock("@/components/legal-footer", () => ({
  LegalFooter: () => <footer data-testid="legal-footer" />,
}));

import OfflinePage from "./page";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OfflinePage", () => {
  it("SPEC-20260712-001 RF-07: exibe o header público", () => {
    render(<OfflinePage />);

    expect(screen.getByTestId("public-header")).toBeInTheDocument();
  });

  it("SPEC-20260712-001 RF-07: exibe o footer público", () => {
    render(<OfflinePage />);

    expect(screen.getByTestId("legal-footer")).toBeInTheDocument();
  });

  it("SPEC-20260712-001 RF-07: exibe mensagem de ausência de conexão", () => {
    render(<OfflinePage />);

    expect(screen.getByRole("heading", { name: "Você está sem conexão" })).toBeInTheDocument();
  });

  it("SPEC-20260712-001 RF-07: exibe botão 'Tentar novamente' que chama window.location.reload", async () => {
    const user = userEvent.setup();
    const reloadMock = vi.fn();
    vi.stubGlobal("window", { ...window, location: { ...window.location, reload: reloadMock } });

    render(<OfflinePage />);

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("exibe o emoji de dispositivo offline", () => {
    render(<OfflinePage />);

    expect(screen.getByText("📴")).toBeInTheDocument();
  });
});
