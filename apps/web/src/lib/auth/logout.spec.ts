import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { EASTER_EGG_SEEN_KEY } from "@/lib/analytics/easter-egg-heatmap";
import { logout } from "./logout";

describe("logout", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    useDashboardStore.getState().setActiveVehicle("v1");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("RF-19: chama /auth/logout e limpa todo o contexto do store", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          status: 204,
          json: () => Promise.resolve({}),
        }),
    );

    await logout();

    expect(useDashboardStore.getState().selectionMode).toBe("none");
    expect(useDashboardStore.getState().activeVehicleId).toBeNull();
  });

  it("RF-19: limpa o contexto mesmo se a chamada de logout falhar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );

    await logout();

    expect(useDashboardStore.getState().selectionMode).toBe("none");
  });

  it("SPEC-20260603-001 RF-23: remove explicitamente a chave de contexto do sessionStorage", async () => {
    sessionStorage.setItem(
      "navestory-dashboard-context",
      JSON.stringify({ state: {}, version: 0 }),
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          status: 204,
          json: () => Promise.resolve({}),
        }),
    );

    await logout();

    expect(sessionStorage.getItem("navestory-dashboard-context")).toBeNull();
  });

  it("SPEC-20260730-002 RF-07: remove a chave navestory-ui-state do sessionStorage", async () => {
    sessionStorage.setItem(
      "navestory-ui-state",
      JSON.stringify({ state: { isSidebarCollapsed: true }, version: 0 }),
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          status: 204,
          json: () => Promise.resolve({}),
        }),
    );

    await logout();

    expect(sessionStorage.getItem("navestory-ui-state")).toBeNull();
  });

  it("SPEC-20260801-001 RF-06: remove a chave do easter egg do localStorage", async () => {
    localStorage.setItem(EASTER_EGG_SEEN_KEY, "true");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          status: 204,
          json: () => Promise.resolve({}),
        }),
    );

    await logout();

    expect(localStorage.getItem(EASTER_EGG_SEEN_KEY)).toBeNull();
  });
});
