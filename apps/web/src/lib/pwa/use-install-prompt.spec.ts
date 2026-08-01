import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInstallPrompt } from "./use-install-prompt";

const VISIT_COUNT_KEY = "navestory-pwa-visit-count";

describe("useInstallPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("SPEC-20260712-001 RF-03: canInstall é false na primeira visita (visitCount < 2)", () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.canInstall).toBe(false);
    expect(localStorage.getItem(VISIT_COUNT_KEY)).toBe("1");
  });

  it("SPEC-20260712-001 RF-03: canInstall é false na segunda visita sem beforeinstallprompt", () => {
    localStorage.setItem(VISIT_COUNT_KEY, "1");

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.canInstall).toBe(false);
    expect(localStorage.getItem(VISIT_COUNT_KEY)).toBe("2");
  });

  it("SPEC-20260712-001 RF-03: canInstall é true na 2ª+ visita quando beforeinstallprompt foi capturado", () => {
    localStorage.setItem(VISIT_COUNT_KEY, "1");

    const { result } = renderHook(() => useInstallPrompt());

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const mockEvent = Object.assign(new Event("beforeinstallprompt"), {
      preventDefault: vi.fn(),
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "" }),
    });

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    expect(result.current.canInstall).toBe(true);
  });

  it("canInstall permanece false na 1ª visita mesmo que beforeinstallprompt dispare", () => {
    const { result } = renderHook(() => useInstallPrompt());

    const mockEvent = Object.assign(new Event("beforeinstallprompt"), {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "accepted", platform: "" }),
    });

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    expect(result.current.canInstall).toBe(false);
  });

  it("promptInstall chama prompt() do evento capturado", async () => {
    localStorage.setItem(VISIT_COUNT_KEY, "1");
    const promptMock = vi.fn().mockResolvedValue(undefined);
    const mockEvent = Object.assign(new Event("beforeinstallprompt"), {
      preventDefault: vi.fn(),
      prompt: promptMock,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "" }),
    });

    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(promptMock).toHaveBeenCalledTimes(1);
  });

  it("promptInstall define canInstall como false após chamar o prompt", async () => {
    localStorage.setItem(VISIT_COUNT_KEY, "1");
    const mockEvent = Object.assign(new Event("beforeinstallprompt"), {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "accepted", platform: "" }),
    });

    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    expect(result.current.canInstall).toBe(true);

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.canInstall).toBe(false);
  });

  it("promptInstall não faz nada quando não há beforeinstallprompt capturado", async () => {
    const { result } = renderHook(() => useInstallPrompt());

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.canInstall).toBe(false);
  });

  it("não lança quando localStorage está indisponível", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("localStorage unavailable");
    });

    expect(() => renderHook(() => useInstallPrompt())).not.toThrow();
  });
});
