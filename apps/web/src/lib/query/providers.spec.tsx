import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryProvider } from "./providers";

describe("QueryProvider", () => {
  it("renderiza os filhos dentro do QueryClientProvider", () => {
    render(
      <QueryProvider>
        <p>conteúdo</p>
      </QueryProvider>,
    );
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});
