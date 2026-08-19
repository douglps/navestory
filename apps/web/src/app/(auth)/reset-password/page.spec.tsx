import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { ApiError } from "@/lib/http/api-client";
import ResetPasswordPage from "./page";

const pushMock = vi.fn();
const searchParams = new URLSearchParams([["token", "tok-123"]]);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

describe("ResetPasswordPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("valida a senha no client antes de chamar a API", async () => {
    render(
      <QueryProvider>
        <ResetPasswordPage />
      </QueryProvider>,
    );

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalled();
  });

  it("redireciona para /login após redefinir a senha (STORY-05)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ message: "ok" });
    render(
      <QueryProvider>
        <ResetPasswordPage />
      </QueryProvider>,
    );

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "abc12!" } });
    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), { target: { value: "abc12!" } });
    fireEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
    expect(apiClient).toHaveBeenCalledWith("/auth/reset-password", {
      method: "POST",
      body: { token: "tok-123", password: "abc12!" },
    });
  });

  it("mostra erro quando o link é inválido/expirado", async () => {
    vi.mocked(apiClient).mockRejectedValue(new ApiError("expirado", 401));
    render(
      <QueryProvider>
        <ResetPasswordPage />
      </QueryProvider>,
    );

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "abc12!" } });
    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), { target: { value: "abc12!" } });
    fireEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));

    expect(await screen.findByText(/inválido ou expirado/)).toBeInTheDocument();
  });
});
