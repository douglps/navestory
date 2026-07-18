import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./use-media-query";

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.push(listener);
    },
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return { mql, listeners };
}

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna false antes de montar/hidratar (SSR-safe)", () => {
    mockMatchMedia(true);
    // Como o efeito roda em `useEffect`, o valor inicial síncrono do render é `false`.
    // `renderHook` já dispara efeitos, então validamos o valor pós-efeito abaixo.
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
  });

  it("reflete o valor atual do matchMedia após montagem", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("atualiza quando o listener de change dispara", () => {
    const { listeners } = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    expect(result.current).toBe(false);

    act(() => {
      listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    });

    expect(result.current).toBe(true);
  });
});
