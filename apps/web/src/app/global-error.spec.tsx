import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("next/error", () => ({
  default: ({ statusCode }: { statusCode: number }) => (
    <div data-testid="next-error" data-status-code={statusCode} />
  ),
}));

import * as Sentry from "@sentry/nextjs";
import GlobalError from "./global-error";

afterEach(() => {
  vi.clearAllMocks();
});

describe("GlobalError", () => {
  it("SPEC-20260716-002 RF-05: captura o erro no Sentry ao montar", () => {
    const error = new Error("crash de teste");
    render(<GlobalError error={error} />);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it("SPEC-20260716-002 RF-05: renderiza NextError com statusCode 0", () => {
    const error = new Error("crash");
    render(<GlobalError error={error} />);

    const el = screen.getByTestId("next-error");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("data-status-code", "0");
  });

  it("captura novamente quando o erro muda", () => {
    const error1 = new Error("erro 1");
    const error2 = new Error("erro 2");

    const { rerender } = render(<GlobalError error={error1} />);
    rerender(<GlobalError error={error2} />);

    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    expect(Sentry.captureException).toHaveBeenLastCalledWith(error2);
  });
});
