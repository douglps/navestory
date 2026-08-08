import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlateInput, formatPlateDisplay } from "./plate-input";

/**
 * @spec SPEC-20260807-003 RF-03
 */
describe("formatPlateDisplay", () => {
  it("não insere hífen antes do 4º caractere", () => {
    expect(formatPlateDisplay("ABC")).toBe("ABC");
  });

  it("insere hífen após o 3º caractere enquanto o formato BR está em andamento", () => {
    expect(formatPlateDisplay("ABC1")).toBe("ABC-1");
    expect(formatPlateDisplay("ABC12")).toBe("ABC-12");
  });

  it("remove o hífen quando o 5º caractere é uma letra (Mercosul)", () => {
    expect(formatPlateDisplay("ABC1D")).toBe("ABC1D");
    expect(formatPlateDisplay("ABC1D23")).toBe("ABC1D23");
  });

  it("mantém formato BR até o final quando o 5º caractere é dígito", () => {
    expect(formatPlateDisplay("ABC1234")).toBe("ABC-1234");
  });
});

describe("PlateInput", () => {
  it("aceita letras minúsculas e converte para uppercase", () => {
    const onChange = vi.fn();
    render(<PlateInput aria-label="placa" value="AB" onChange={onChange} />);
    const input = screen.getByLabelText("placa");

    fireEvent.keyDown(input, { key: "c" });

    expect(onChange).toHaveBeenCalledWith("ABC");
  });

  it("recusa dígito nas 3 primeiras posições", () => {
    const onChange = vi.fn();
    render(<PlateInput aria-label="placa" value="" onChange={onChange} />);
    const input = screen.getByLabelText("placa");

    fireEvent.keyDown(input, { key: "1" });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("recusa letra na 4ª posição (sempre dígito)", () => {
    const onChange = vi.fn();
    render(<PlateInput aria-label="placa" value="ABC" onChange={onChange} />);
    const input = screen.getByLabelText("placa");

    fireEvent.keyDown(input, { key: "d" });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("aceita letra ou dígito na 5ª posição", () => {
    const onChangeLetter = vi.fn();
    const { rerender } = render(
      <PlateInput aria-label="placa" value="ABC1" onChange={onChangeLetter} />,
    );
    fireEvent.keyDown(screen.getByLabelText("placa"), { key: "d" });
    expect(onChangeLetter).toHaveBeenCalledWith("ABC1D");

    const onChangeDigit = vi.fn();
    rerender(<PlateInput aria-label="placa" value="ABC1" onChange={onChangeDigit} />);
    fireEvent.keyDown(screen.getByLabelText("placa"), { key: "2" });
    expect(onChangeDigit).toHaveBeenCalledWith("ABC12");
  });

  it("Backspace remove o último caractere cru", () => {
    const onChange = vi.fn();
    render(<PlateInput aria-label="placa" value="ABC1" onChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("placa"), { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith("ABC");
  });

  it("ignora digitação além de 7 caracteres crus", () => {
    const onChange = vi.fn();
    render(<PlateInput aria-label="placa" value="ABC1D23" onChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("placa"), { key: "9" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exibe o valor formatado com hífen quando o formato BR está em andamento", () => {
    const onChange = vi.fn();
    render(<PlateInput aria-label="placa" value="ABC1234" onChange={onChange} />);
    expect(screen.getByLabelText("placa")).toHaveValue("ABC-1234");
  });
});
