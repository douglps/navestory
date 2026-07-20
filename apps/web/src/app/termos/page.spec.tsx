import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsOfServicePage from "./page";

/** @spec SPEC-20260720-001 RF-02, US-01 */
describe("TermsOfServicePage", () => {
  it("renderiza o conteúdo de docs/legal/terms-of-service.md", () => {
    render(<TermsOfServicePage />);

    expect(screen.getByRole("heading", { name: /Termos de Uso/i })).toBeInTheDocument();
  });
});
