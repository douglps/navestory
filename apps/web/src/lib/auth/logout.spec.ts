import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { logout } from "./logout";

describe("logout", () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardStore.getState().setActiveVehicle("v1");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("RF-19: chama /auth/logout e limpa todo o contexto do store", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve({}) }),
    );

    await logout();

    expect(useDashboardStore.getState().selectionMode).toBe("none");
    expect(useDashboardStore.getState().activeVehicleId).toBeNull();
  });

  it("RF-19: limpa o contexto mesmo se a chamada de logout falhar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    await logout();

    expect(useDashboardStore.getState().selectionMode).toBe("none");
  });
});
