import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const captureExceptionMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}));

import AppError from "./error";

describe("AppError", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("SPEC-20260716-002 RF-05: reporta o erro ao Sentry e exibe fallback amigável", () => {
    const error = Object.assign(new Error("falha de render"), { digest: "abc123" });
    render(<AppError error={error} reset={vi.fn()} />);

    expect(captureExceptionMock).toHaveBeenCalledWith(error);
    expect(screen.getByText("Algo deu errado nesta tela")).toBeInTheDocument();
  });

  it("chama reset ao clicar em 'Tentar novamente'", () => {
    const resetMock = vi.fn();
    render(<AppError error={new Error("falha")} reset={resetMock} />);

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(resetMock).toHaveBeenCalledOnce();
  });
});
