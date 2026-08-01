import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/use-online-status", () => ({
  useOnlineStatus: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("@/lib/pwa/get-cache-age", () => ({
  getMostRecentCacheTimestamp: vi.fn(),
}));

vi.mock("@/lib/pwa/format-cache-age", () => ({
  formatCacheAge: vi.fn(),
}));

import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { getMostRecentCacheTimestamp } from "@/lib/pwa/get-cache-age";
import { formatCacheAge } from "@/lib/pwa/format-cache-age";
import { ConnectivityIndicator } from "./connectivity-indicator";

afterEach(() => {
  vi.clearAllMocks();
});

describe("ConnectivityIndicator", () => {
  it("SPEC-20260712-001 RF-13: não renderiza nada quando online", () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true);

    const { container } = render(<ConnectivityIndicator />);

    expect(container).toBeEmptyDOMElement();
  });

  it("SPEC-20260712-001 RF-13: exibe pill 'Offline' quando offline e sem cache disponível", async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);
    vi.mocked(getMostRecentCacheTimestamp).mockResolvedValue(null);

    render(<ConnectivityIndicator />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
    expect(screen.getByRole("status").textContent).toBe("Offline");
  });

  it("SPEC-20260712-001 RF-13.1: exibe 'Offline · Atualizado ...' quando há timestamp de cache", async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);
    const ts = new Date("2026-07-18T08:42:00");
    vi.mocked(getMostRecentCacheTimestamp).mockResolvedValue(ts);
    vi.mocked(formatCacheAge).mockReturnValue("Hoje 08:42");

    render(<ConnectivityIndicator />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Offline · Atualizado Hoje 08:42");
    });
  });

  it("SPEC-20260712-001 RF-13: consulta getMostRecentCacheTimestamp com o pathname atual quando offline", async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);
    vi.mocked(getMostRecentCacheTimestamp).mockResolvedValue(null);

    render(<ConnectivityIndicator />);

    await waitFor(() => {
      expect(getMostRecentCacheTimestamp).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("limpa o ageLabel e cancela requisição pendente ao ficar online novamente", async () => {
    let isOnline = false;
    vi.mocked(useOnlineStatus).mockImplementation(() => isOnline);
    vi.mocked(getMostRecentCacheTimestamp).mockResolvedValue(null);

    const { rerender } = render(<ConnectivityIndicator />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).toBeInTheDocument();
    });

    isOnline = true;
    rerender(<ConnectivityIndicator />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
