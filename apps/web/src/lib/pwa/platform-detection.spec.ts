import { afterEach, describe, expect, it, vi } from "vitest";
import { isIosInstallable } from "./platform-detection";

describe("isIosInstallable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("RF-04: retorna true em Safari iOS fora do modo standalone", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      standalone: false,
    });

    expect(isIosInstallable()).toBe(true);
  });

  it("RF-04: retorna false quando já instalado (navigator.standalone === true)", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      standalone: true,
    });

    expect(isIosInstallable()).toBe(false);
  });

  it("RF-04: retorna false em Chrome/Android (não deve mostrar banner iOS)", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0",
      standalone: undefined,
    });

    expect(isIosInstallable()).toBe(false);
  });
});
