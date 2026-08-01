import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pwa/platform-detection", () => ({
  isIosInstallable: vi.fn(),
}));

import { isIosInstallable } from "@/lib/pwa/platform-detection";
import { IosInstallBanner } from "./ios-install-banner";

const DISMISSED_KEY = "navestory-ios-install-banner-dismissed";

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("IosInstallBanner", () => {
  it("SPEC-20260712-001 RF-04: não renderiza em ambiente não-iOS", () => {
    vi.mocked(isIosInstallable).mockReturnValue(false);

    const { container } = render(<IosInstallBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("SPEC-20260712-001 RF-04: exibe banner de instruções em Safari iOS instalável", () => {
    vi.mocked(isIosInstallable).mockReturnValue(true);

    render(<IosInstallBanner />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeInTheDocument();
  });

  it("RF-04: não exibe o banner quando já foi dispensado nesta sessão", () => {
    vi.mocked(isIosInstallable).mockReturnValue(true);
    sessionStorage.setItem(DISMISSED_KEY, "1");

    const { container } = render(<IosInstallBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("RF-04: dispensa o banner ao clicar no botão e grava flag no sessionStorage", async () => {
    const user = userEvent.setup();
    vi.mocked(isIosInstallable).mockReturnValue(true);

    render(<IosInstallBanner />);

    expect(screen.getByRole("status")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dispensar" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(DISMISSED_KEY)).toBe("1");
  });
});
