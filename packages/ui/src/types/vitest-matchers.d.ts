import "vitest";

// @spec SPEC-20260525-001 §4.4 — augmenta o Assertion do vitest com o matcher do jest-axe
// (a lib tipa originalmente para @types/jest, não para vitest).
declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T;
  }
}
