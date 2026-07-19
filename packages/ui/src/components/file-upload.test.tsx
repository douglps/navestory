import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { FileUpload } from "./file-upload";

function makeFile(name: string, sizeBytes: number, type = "application/pdf"): File {
  const file = new File(["x".repeat(Math.max(1, sizeBytes))], name, { type });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

describe("FileUpload", () => {
  it("chama onFilesChange ao selecionar um arquivo válido", async () => {
    const user = userEvent.setup();
    const onFilesChange = vi.fn();
    render(<FileUpload label="Comprovante" onFilesChange={onFilesChange} />);

    const file = makeFile("nota.pdf", 1024);
    await user.upload(screen.getByLabelText(/Comprovante/), file);

    expect(onFilesChange).toHaveBeenCalledWith([file]);
    expect(screen.getByText("nota.pdf")).toBeInTheDocument();
  });

  it("rejeita arquivo acima do tamanho máximo", async () => {
    const user = userEvent.setup();
    const onFilesChange = vi.fn();
    render(<FileUpload maxSize={1024} onFilesChange={onFilesChange} />);

    const file = makeFile("grande.pdf", 2048);
    await user.upload(screen.getByLabelText(/Selecionar arquivo/), file);

    expect(onFilesChange).not.toHaveBeenCalled();
    expect(screen.getByText(/excede o tamanho máximo/)).toBeInTheDocument();
  });

  it("rejeita quando excede maxFiles", async () => {
    const user = userEvent.setup();
    const onFilesChange = vi.fn();
    render(<FileUpload maxFiles={1} onFilesChange={onFilesChange} />);

    const input = screen.getByLabelText(/Selecionar arquivo/);
    await user.upload(input, makeFile("a.pdf", 100));
    await user.upload(input, makeFile("b.pdf", 100));

    expect(onFilesChange).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Selecione apenas 1 arquivo")).toBeInTheDocument();
  });

  it("remove um arquivo selecionado", async () => {
    const user = userEvent.setup();
    const onFilesChange = vi.fn();
    render(<FileUpload onFilesChange={onFilesChange} />);

    await user.upload(screen.getByLabelText(/Selecionar arquivo/), makeFile("nota.pdf", 100));
    await user.click(screen.getByRole("button", { name: "Remover nota.pdf" }));

    expect(onFilesChange).toHaveBeenLastCalledWith([]);
    expect(screen.queryByText("nota.pdf")).not.toBeInTheDocument();
  });

  it("exibe a mensagem de erro externa", () => {
    render(<FileUpload onFilesChange={vi.fn()} error="Comprovante obrigatório" />);

    expect(screen.getByText("Comprovante obrigatório")).toBeInTheDocument();
  });

  it("não possui violações de acessibilidade", async () => {
    const { container } = render(
      <FileUpload label="Comprovante" hint="PDF até 10MB" onFilesChange={vi.fn()} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
