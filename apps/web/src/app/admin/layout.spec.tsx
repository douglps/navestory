import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/decode-jwt-role", () => ({
  decodeJwtRole: vi.fn(),
}));

vi.mock("./admin-nav", () => ({
  AdminNav: () => <header data-testid="admin-nav" />,
}));

import { cookies } from "next/headers";
import { decodeJwtRole } from "@/lib/auth/decode-jwt-role";
import AdminLayout from "./layout";

function makeCookieStore(token?: string) {
  return {
    get: vi.fn((name: string) =>
      name === "navestory_access_token" && token ? { value: token } : undefined,
    ),
  };
}

beforeEach(() => {
  redirectMock.mockClear();
  vi.mocked(decodeJwtRole).mockReset();
});

describe("AdminLayout", () => {
  it("SPEC-20260731-008 RF-09: redireciona para /403 quando não há cookie de acesso", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookieStore() as unknown as Awaited<ReturnType<typeof cookies>>);

    await AdminLayout({ children: <div>admin</div> });

    expect(redirectMock).toHaveBeenCalledWith("/403");
  });

  it("SPEC-20260731-008 RF-09: redireciona para /403 quando role não é 'admin'", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("user-token") as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(decodeJwtRole).mockReturnValue("user");

    await AdminLayout({ children: <div>admin</div> });

    expect(redirectMock).toHaveBeenCalledWith("/403");
  });

  it("SPEC-20260731-008 RF-09: redireciona para /403 quando role é null", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("some-token") as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(decodeJwtRole).mockReturnValue(null);

    await AdminLayout({ children: <div>admin</div> });

    expect(redirectMock).toHaveBeenCalledWith("/403");
  });

  it("SPEC-20260731-008 RNF-04: renderiza AdminNav e os filhos quando role é 'admin'", async () => {
    vi.mocked(cookies).mockResolvedValue(makeCookieStore("admin-token") as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(decodeJwtRole).mockReturnValue("admin");

    const result = await AdminLayout({ children: <div data-testid="admin-child">conteúdo admin</div> });

    render(result as ReactElement);

    expect(screen.getByTestId("admin-nav")).toBeInTheDocument();
    expect(screen.getByTestId("admin-child")).toBeInTheDocument();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
