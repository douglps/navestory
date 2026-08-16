import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReceiptField } from "./receipt-field";

function makeFile(name: string, sizeBytes: number, type: string): File {
  const file = new File(["x".repeat(Math.max(1, sizeBytes))], name, { type });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

function Controlled({
  disabled,
  initialFile = null,
}: {
  disabled?: boolean;
  initialFile?: File | null;
}) {
  const [file, setFile] = useState<File | null>(initialFile);
  return <ReceiptField file={file} onChange={setFile} disabled={disabled} />;
}

// @spec SPEC-20260814-004 RF-01, RF-04, RF-10, RF-12, RNF-07
describe("ReceiptField", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("RF-10: começa vazio, sem nenhum arquivo selecionado (campo opcional)", () => {
    render(<Controlled />);

    expect(screen.getByLabelText(/Comprovante \(opcional\)/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Remover comprovante")).not.toBeInTheDocument();
  });

  it("RF-01: seleciona um PDF válido e mostra o nome do arquivo com ícone estático (sem prévia)", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    const file = makeFile("cupom.pdf", 1024, "application/pdf");
    await user.upload(screen.getByLabelText(/Comprovante \(opcional\)/), file);

    expect(screen.getByText("cupom.pdf")).toBeInTheDocument();
    expect(screen.getByLabelText("Remover comprovante")).toBeInTheDocument();
  });

  it("RF-01: seleciona uma imagem válida e gera prévia local (object URL)", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    const file = makeFile("cupom.jpg", 2048, "image/jpeg");
    await user.upload(screen.getByLabelText(/Comprovante \(opcional\)/), file);

    expect(screen.getByAltText("Prévia do comprovante selecionado")).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  it("RF-04: rejeita arquivo acima de 10MB com mensagem inline específica", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    const file = makeFile("grande.jpg", 11 * 1024 * 1024, "image/jpeg");
    await user.upload(screen.getByLabelText(/Selecionar arquivo/), file);

    expect(screen.getByText(/excede o tamanho máximo/)).toBeInTheDocument();
    expect(screen.queryByText("grande.jpg")).not.toBeInTheDocument();
  });

  it("RF-04: rejeita tipo de arquivo não suportado com mensagem inline específica", () => {
    render(<Controlled />);

    const file = makeFile("relatorio.docx", 1024, "application/msword");
    // `userEvent.upload` respeita o `accept` do input e não dispara o `change` para tipos fora da
    // allowlist — usa-se `fireEvent` para simular contornar o picker nativo do SO (mesmo cenário
    // que a validação server-side em R-SAN-05 cobre em profundidade).
    fireEvent.change(screen.getByLabelText(/Selecionar arquivo/), {
      target: { files: [file] },
    });

    expect(
      screen.getByText(/Tipo de arquivo não suportado/),
    ).toBeInTheDocument();
  });

  it("RF-12: 'Remover' limpa o arquivo selecionado sem chamada ao servidor", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.upload(
      screen.getByLabelText(/Comprovante \(opcional\)/),
      makeFile("cupom.pdf", 1024, "application/pdf"),
    );
    await user.click(screen.getByLabelText("Remover comprovante"));

    expect(screen.queryByText("cupom.pdf")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Comprovante \(opcional\)/)).toBeInTheDocument();
  });

  it("desabilita o botão Remover quando disabled=true", () => {
    render(
      <Controlled
        disabled
        initialFile={makeFile("cupom.pdf", 1024, "application/pdf")}
      />,
    );

    expect(screen.getByLabelText("Remover comprovante")).toBeDisabled();
  });
});
