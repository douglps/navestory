import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "./ui-store";

function getPersisted(): { state: { isSidebarCollapsed?: boolean } } | null {
  const raw = sessionStorage.getItem("navestory-ui-state");
  return raw ? JSON.parse(raw) : null;
}

describe("useUIStore", () => {
  it("alterna isMobileNavOpen", () => {
    expect(useUIStore.getState().isMobileNavOpen).toBe(false);
    useUIStore.getState().toggleMobileNav();
    expect(useUIStore.getState().isMobileNavOpen).toBe(true);
  });
});

describe("useUIStore — persistência de isSidebarCollapsed (SPEC-20260730-002 RF-06)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useUIStore.setState({ isSidebarCollapsed: false, isMobileNavOpen: false });
  });

  it("R-NAV-06: persiste isSidebarCollapsed em sessionStorage sob a chave navestory-ui-state", () => {
    useUIStore.getState().toggleSidebarCollapsed();

    expect(getPersisted()?.state.isSidebarCollapsed).toBe(true);
  });

  it("partialize: não persiste isMobileNavOpen (estado efêmero de UI)", () => {
    useUIStore.getState().toggleMobileNav();

    expect(getPersisted()?.state).not.toHaveProperty("isMobileNavOpen");
  });
});

describe("useUIStore — fila de toasts (SPEC-20260525-001 §8.2)", () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
  });

  it("pushToast adiciona um item com id gerado", () => {
    useUIStore.getState().pushToast({ title: "Salvo" });

    const { toasts } = useUIStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.title).toBe("Salvo");
    expect(toasts[0]?.id).toEqual(expect.any(String));
  });

  it("dismissToast remove o item pelo id", () => {
    useUIStore.getState().pushToast({ title: "Salvo" });
    const id = useUIStore.getState().toasts[0]?.id;
    if (!id) throw new Error("toast não foi adicionado");

    useUIStore.getState().dismissToast(id);

    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  it("empilha múltiplos toasts em ordem", () => {
    useUIStore.getState().pushToast({ title: "Primeiro" });
    useUIStore.getState().pushToast({ title: "Segundo" });

    const { toasts } = useUIStore.getState();
    expect(toasts.map((t) => t.title)).toEqual(["Primeiro", "Segundo"]);
  });
});
