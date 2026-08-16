import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { ReceiptIndicator, ReceiptViewer } from "./receipt-viewer";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

function renderViewer(expenseId: string, hasReceipt: boolean) {
  return render(
    <QueryProvider>
      <ReceiptViewer expenseId={expenseId} hasReceipt={hasReceipt} />
    </QueryProvider>,
  );
}

// @spec SPEC-20260814-004 RF-05, RF-06, RF-07, RNF-03, US-02
describe("ReceiptViewer", () => {
  afterEach(() => vi.clearAllMocks());

  it("US-02: não renderiza nada nem busca URLs quando a despesa não tem comprovante", () => {
    const { container } = renderViewer("e1", false);

    expect(apiClient).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("decisão de thumbnail assíncrono: mostra fallback 'preparando prévia' quando thumbnail_status=pending", async () => {
    vi.mocked(apiClient).mockResolvedValue({
      original_url: "https://signed/original.jpg",
      thumbnail_url: null,
      thumbnail_status: "pending",
      is_pdf: false,
    } as never);
    renderViewer("e1", true);

    expect(
      await screen.findByText("Comprovante anexado — preparando prévia"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://signed/original.jpg",
    );
  });

  it("RF-06: mostra o thumbnail quando thumbnail_status=completed", async () => {
    vi.mocked(apiClient).mockResolvedValue({
      original_url: "https://signed/original.jpg",
      thumbnail_url: "https://signed/thumb.jpg",
      thumbnail_status: "completed",
      is_pdf: false,
    } as never);
    renderViewer("e1", true);

    const img = await screen.findByAltText("Prévia do comprovante");
    expect(img).toHaveAttribute("src", "https://signed/thumb.jpg");
    expect(screen.getByText("Ver comprovante")).toBeInTheDocument();
  });

  it("R-RCP-05: PDF nunca mostra 'preparando prévia' — sempre ícone estático, mesmo com thumbnail_status not_applicable", async () => {
    vi.mocked(apiClient).mockResolvedValue({
      original_url: "https://signed/original.pdf",
      thumbnail_url: null,
      thumbnail_status: "not_applicable",
      is_pdf: true,
    } as never);
    renderViewer("e1", true);

    expect(await screen.findByText("Ver comprovante")).toBeInTheDocument();
    expect(
      screen.queryByText("Comprovante anexado — preparando prévia"),
    ).not.toBeInTheDocument();
  });

  it("R-RCP-05: geração falha (thumbnail_status=failed) cai no fallback estático permanentemente", async () => {
    vi.mocked(apiClient).mockResolvedValue({
      original_url: "https://signed/original.jpg",
      thumbnail_url: null,
      thumbnail_status: "failed",
      is_pdf: false,
    } as never);
    renderViewer("e1", true);

    expect(await screen.findByText("Ver comprovante")).toBeInTheDocument();
    expect(screen.queryByAltText("Prévia do comprovante")).not.toBeInTheDocument();
  });
});

// @spec SPEC-20260814-004 US-02
describe("ReceiptIndicator", () => {
  it("renderiza um ícone com label acessível de comprovante anexado", () => {
    render(<ReceiptIndicator />);

    expect(
      screen.getByLabelText("Despesa com comprovante anexado"),
    ).toBeInTheDocument();
  });
});
