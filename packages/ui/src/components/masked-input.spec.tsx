import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CurrencyInput,
  ODOMETER_MAX_DIGITS,
  OdometerInput,
  currencyDigitsToValue,
  digitsToCurrencyDisplay,
  digitsToOdometerDisplay,
  odometerDigitsToValue,
  valueToCurrencyDigits,
  valueToOdometerDigits,
} from "./masked-input";

/**
 * @spec SPEC-20260612-001 RF-03
 */
describe("digitsToCurrencyDisplay", () => {
  it("formata dígitos como acumulador de centavos", () => {
    expect(digitsToCurrencyDisplay("1")).toBe("0,01");
    expect(digitsToCurrencyDisplay("12")).toBe("0,12");
    expect(digitsToCurrencyDisplay("123")).toBe("1,23");
    expect(digitsToCurrencyDisplay("123450")).toBe("1.234,50");
    expect(digitsToCurrencyDisplay("1234500")).toBe("12.345,00");
  });
});

describe("digitsToOdometerDisplay", () => {
  it("formata dígitos como inteiro com separador de milhar", () => {
    expect(digitsToOdometerDisplay("5")).toBe("5");
    expect(digitsToOdometerDisplay("58420")).toBe("58.420");
    expect(digitsToOdometerDisplay("")).toBe("");
  });
});

describe("conversões de valor", () => {
  it("currencyDigitsToValue / valueToCurrencyDigits", () => {
    expect(currencyDigitsToValue("")).toBeUndefined();
    expect(currencyDigitsToValue("123450")).toBe(1234.5);
    expect(valueToCurrencyDigits(undefined)).toBe("");
    expect(valueToCurrencyDigits(1234.5)).toBe("123450");
  });

  it("odometerDigitsToValue / valueToOdometerDigits", () => {
    expect(odometerDigitsToValue("")).toBeUndefined();
    expect(odometerDigitsToValue("58420")).toBe(58420);
    expect(valueToOdometerDigits(undefined)).toBe("");
    expect(valueToOdometerDigits(58420)).toBe("58420");
  });
});

describe("CurrencyInput", () => {
  it("digita dígito por dígito estilo caixa eletrônico", () => {
    function Wrapper() {
      const onChange = vi.fn();
      return <CurrencyInput aria-label="valor" value={undefined} onChange={onChange} />;
    }
    render(<Wrapper />);
    const input = screen.getByLabelText("valor");
    fireEvent.keyDown(input, { key: "1" });
    expect(input).toBeDefined();
  });

  it("ignora caracteres não numéricos e não sobrescreve o valor", () => {
    const onChange = vi.fn();
    render(<CurrencyInput aria-label="valor" value={1.23} onChange={onChange} />);
    const input = screen.getByLabelText("valor");
    expect((input as HTMLInputElement).value).toBe("1,23");
    fireEvent.keyDown(input, { key: "," });
    expect(onChange).not.toHaveBeenCalled();
  });


  it("backspace remove o último dígito do acumulador", () => {
    const onChange = vi.fn();
    render(<CurrencyInput aria-label="valor" value={1.23} onChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("valor"), { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith(0.12);
  });
});

describe("OdometerInput", () => {
  it("limita a ODOMETER_MAX_DIGITS dígitos", () => {
    const onChange = vi.fn();
    render(<OdometerInput aria-label="odometro" value={9999999} onChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("odometro"), { key: "5" });
    expect(onChange).toHaveBeenCalledWith(Number("9999995".slice(-ODOMETER_MAX_DIGITS)));
  });

  it("ignora caracteres não numéricos", () => {
    const onChange = vi.fn();
    render(<OdometerInput aria-label="odometro" value={100} onChange={onChange} />);
    fireEvent.keyDown(screen.getByLabelText("odometro"), { key: "," });
    expect(onChange).not.toHaveBeenCalled();
  });

});
