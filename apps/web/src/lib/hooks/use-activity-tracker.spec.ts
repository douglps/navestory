import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

import { useActivityTracker } from "./use-activity-tracker";

describe("useActivityTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("chama onIdle após 30min sem atividade (§2)", () => {
    const onIdle = vi.fn();
    const onRefresh = vi.fn();

    renderHook(() => useActivityTracker({ expiresAt: null, onIdle, onRefresh }));

    vi.advanceTimersByTime(30 * 60 * 1000 + 30_000);

    expect(onIdle).toHaveBeenCalled();
  });

  it("não chama onIdle enquanto há atividade recente (click reseta o timer)", () => {
    const onIdle = vi.fn();
    const onRefresh = vi.fn();

    renderHook(() => useActivityTracker({ expiresAt: null, onIdle, onRefresh }));

    vi.advanceTimersByTime(20 * 60 * 1000);
    window.dispatchEvent(new Event("click"));
    vi.advanceTimersByTime(20 * 60 * 1000);

    expect(onIdle).not.toHaveBeenCalled();
  });

  it("chama onRefresh quando o token expira em <5min e há atividade (STORY-07a)", () => {
    const onIdle = vi.fn();
    const onRefresh = vi.fn();
    const expiresAt = new Date(Date.now() + 4 * 60 * 1000);

    renderHook(() => useActivityTracker({ expiresAt, onIdle, onRefresh }));

    vi.advanceTimersByTime(30_000);

    expect(onRefresh).toHaveBeenCalled();
    expect(onIdle).not.toHaveBeenCalled();
  });
});
