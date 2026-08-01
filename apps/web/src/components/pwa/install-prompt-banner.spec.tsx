import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pwa/use-install-prompt", () => ({
  useInstallPrompt: vi.fn(),
}));

import { useInstallPrompt } from "@/lib/pwa/use-install-prompt";
import { InstallPromptBanner } from "./install-prompt-banner";

afterEach(() => {
  vi.clearAllMocks();
});

describe("InstallPromptBanner", () => {
  it("SPEC-20260712-001 RF-03: não renderiza quando canInstall é false", () => {
    vi.mocked(useInstallPrompt).mockReturnValue({
      canInstall: false,
      promptInstall: vi.fn(),
    });

    const { container } = render(<InstallPromptBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("SPEC-20260712-001 RF-03: renderiza o banner quando canInstall é true", () => {
    vi.mocked(useInstallPrompt).mockReturnValue({
      canInstall: true,
      promptInstall: vi.fn(),
    });

    render(<InstallPromptBanner />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Instale o navestory/)).toBeInTheDocument();
  });

  it("chama promptInstall ao clicar em 'Instalar app'", async () => {
    const user = userEvent.setup();
    const promptInstallMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useInstallPrompt).mockReturnValue({
      canInstall: true,
      promptInstall: promptInstallMock,
    });

    render(<InstallPromptBanner />);

    await user.click(screen.getByRole("button", { name: "Instalar app" }));

    expect(promptInstallMock).toHaveBeenCalledTimes(1);
  });

  it("dispensa o banner ao clicar no botão de dispensar", async () => {
    const user = userEvent.setup();
    vi.mocked(useInstallPrompt).mockReturnValue({
      canInstall: true,
      promptInstall: vi.fn(),
    });

    render(<InstallPromptBanner />);

    expect(screen.getByRole("status")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dispensar" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
