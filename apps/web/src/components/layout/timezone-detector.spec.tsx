import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

vi.mock("@/lib/hooks/use-preferences", () => ({
  usePreferences: vi.fn(),
}));

import { apiClient } from "@/lib/http/api-client";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { TimezoneDetector } from "./timezone-detector";

function renderDetector(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <TimezoneDetector />
    </QueryClientProvider> as ReactNode,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TimezoneDetector", () => {
  it("SPEC-20260715-002 RF-FE-01: não renderiza nenhum elemento visual (componente headless)", () => {
    vi.mocked(usePreferences).mockReturnValue({ data: { timezone: "America/Sao_Paulo" }, isLoading: false } as ReturnType<typeof usePreferences>);

    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <TimezoneDetector />
      </QueryClientProvider> as ReactNode,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("não dispara PATCH quando preferences ainda está carregando", () => {
    vi.mocked(usePreferences).mockReturnValue({ data: undefined, isLoading: true } as ReturnType<typeof usePreferences>);

    renderDetector();

    expect(apiClient).not.toHaveBeenCalled();
  });

  it("não dispara PATCH quando o usuário já tem timezone configurado", () => {
    vi.mocked(usePreferences).mockReturnValue({
      data: { timezone: "America/Sao_Paulo", auto_draft_enabled: false },
      isLoading: false,
    } as ReturnType<typeof usePreferences>);

    renderDetector();

    expect(apiClient).not.toHaveBeenCalled();
  });

  it("SPEC-20260715-002 RF-FE-01: dispara PATCH /preferences quando timezone é null", async () => {
    vi.mocked(usePreferences).mockReturnValue({
      data: { timezone: null, auto_draft_enabled: false },
      isLoading: false,
    } as ReturnType<typeof usePreferences>);
    vi.mocked(apiClient).mockResolvedValue({ timezone: "America/Sao_Paulo" });

    renderDetector();

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        "/preferences",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  it("SPEC-20260715-002 RNF-04: não dispara PATCH duas vezes (proteção via hasAttempted ref)", async () => {
    vi.mocked(usePreferences).mockReturnValue({
      data: { timezone: null, auto_draft_enabled: false },
      isLoading: false,
    } as ReturnType<typeof usePreferences>);
    vi.mocked(apiClient).mockResolvedValue({ timezone: "America/Sao_Paulo" });

    const { rerender } = render(
      <QueryClientProvider client={new QueryClient()}>
        <TimezoneDetector />
      </QueryClientProvider> as ReactNode,
    );

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledTimes(1);
    });

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <TimezoneDetector />
      </QueryClientProvider> as ReactNode,
    );

    expect(apiClient).toHaveBeenCalledTimes(1);
  });
});
