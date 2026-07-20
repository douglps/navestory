import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage from "./page";

/** @spec SPEC-20260720-001 RF-01, US-01 */
describe("PrivacyPolicyPage", () => {
  it("renderiza o conteúdo de docs/legal/privacy-policy.md", () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByRole("heading", { name: /Política de Privacidade/i })).toBeInTheDocument();
    expect(screen.getAllByText(/LGPD/).length).toBeGreaterThan(0);
  });
});
