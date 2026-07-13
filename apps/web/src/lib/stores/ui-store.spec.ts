import { describe, expect, it } from "vitest";
import { useUIStore } from "./ui-store";

describe("useUIStore", () => {
  it("alterna isMobileNavOpen", () => {
    expect(useUIStore.getState().isMobileNavOpen).toBe(false);
    useUIStore.getState().toggleMobileNav();
    expect(useUIStore.getState().isMobileNavOpen).toBe(true);
  });
});
