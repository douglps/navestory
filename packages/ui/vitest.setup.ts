import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import { toHaveNoViolations } from "jest-axe";

// @spec SPEC-20260525-001 §4.4
expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

// @spec SPEC-20260525-001 §7.2 — jsdom não implementa ResizeObserver nem os métodos de
// Pointer Capture; `@radix-ui/react-popover`/`cmdk` (Combobox) dependem deles em runtime.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as never);

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
