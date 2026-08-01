import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom não implementa ResizeObserver; recharts (ResponsiveContainer) depende dele em runtime.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as never);

// jsdom não faz layout real — getBoundingClientRect() sempre retorna 0. O ResponsiveContainer do
// recharts@3 usa exatamente esse valor para dimensionar o gráfico (ver ResponsiveContainer.js),
// e emite o warning "width(0) and height(0)" sem ele. Fixando um tamanho não-zero aqui os
// gráficos passam a medir e renderizar como em produção, em vez de só suprimir o log.
Element.prototype.getBoundingClientRect = (): DOMRect => ({
  width: 600,
  height: 300,
  top: 0,
  left: 0,
  bottom: 300,
  right: 600,
  x: 0,
  y: 0,
  toJSON() {
    return this;
  },
});

// jsdom não implementa Pointer Capture; `@radix-ui/react-popover`/`cmdk` (Combobox de @navestory/ui)
// dependem deles em runtime (mesmo stub usado em packages/ui/vitest.setup.ts).
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = (): boolean => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = (): void => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = (): void => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = (): void => {};
}
