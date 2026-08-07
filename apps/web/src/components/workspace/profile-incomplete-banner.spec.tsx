import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileIncompleteBanner } from "./profile-incomplete-banner";

const pathnameMock = vi.fn(() => "/dashboard");

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

const WORKSPACE_MEMBER = { id: "w1", role: "workspace_member" };
const WORKSPACE_OWNER = { id: "w1", role: "workspace_owner" };
const SETTINGS_ALL_REQUIRED = {
  requireCnhNumber: true,
  requireCnhCategory: true,
  requireCnhExpiry: true,
  requirePhone: true,
};
const PROFILE_COMPLETE = {
  cnhNumber: "12345678900",
  cnhCategory: "B",
  cnhExpiresAt: "2030-01-01",
  phone: "11999999999",
};

function stubFetch(handlers: {
  workspace?: unknown;
  settings?: unknown;
  profile?: unknown;
}) {
  const fetchMock = vi.fn((url: string) => {
    const path = url.replace("/api/backend", "");
    let data: unknown = null;
    if (path === "/workspaces/me") data = handlers.workspace ?? null;
    else if (path.endsWith("/driver-settings")) data = handlers.settings ?? null;
    else if (path.endsWith("/members/me/profile")) data = handlers.profile ?? null;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data }),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderBanner(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ProfileIncompleteBanner />
    </QueryClientProvider> as ReactNode,
  );
}

describe("ProfileIncompleteBanner", () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue("/dashboard");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("não renderiza nada quando o usuário não é membro (é workspace_owner)", async () => {
    stubFetch({ workspace: WORKSPACE_OWNER });
    renderBanner();

    await waitFor(() => expect(document.body.textContent).not.toMatch(/incompleto/));
  });

  it("não renderiza nada dentro de /workspace", async () => {
    pathnameMock.mockReturnValue("/workspace");
    stubFetch({
      workspace: WORKSPACE_MEMBER,
      settings: SETTINGS_ALL_REQUIRED,
      profile: {},
    });
    renderBanner();

    await waitFor(() => expect(document.body.textContent).not.toMatch(/incompleto/));
  });

  it("não renderiza nada quando o cadastro já está completo", async () => {
    const fetchMock = stubFetch({
      workspace: WORKSPACE_MEMBER,
      settings: SETTINGS_ALL_REQUIRED,
      profile: PROFILE_COMPLETE,
    });
    renderBanner();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("RF-05: exibe o aviso quando falta um requisito exigido pelo workspace", async () => {
    stubFetch({
      workspace: WORKSPACE_MEMBER,
      settings: SETTINGS_ALL_REQUIRED,
      profile: { cnhNumber: null, cnhCategory: "B", cnhExpiresAt: "2030-01-01", phone: "11999999999" },
    });
    renderBanner();

    await waitFor(() =>
      expect(screen.getByText("Seu cadastro de motorista está incompleto.")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Completar agora" })).toHaveAttribute(
      "href",
      "/workspace/onboarding",
    );
  });
});
