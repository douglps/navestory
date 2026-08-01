import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "./theme-provider";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ThemeProvider", () => {
  it("SPEC-20260721-001 RF-03: renderiza os filhos sem erros", () => {
    render(
      <ThemeProvider>
        <span>conteúdo filho</span>
      </ThemeProvider>,
    );

    expect(screen.getByText("conteúdo filho")).toBeInTheDocument();
  });

  it("SPEC-20260721-001 RF-03: aceita múltiplos filhos", () => {
    render(
      <ThemeProvider>
        <span>filho 1</span>
        <span>filho 2</span>
      </ThemeProvider>,
    );

    expect(screen.getByText("filho 1")).toBeInTheDocument();
    expect(screen.getByText("filho 2")).toBeInTheDocument();
  });
});
