// @spec SPEC-20260525-001 §4.4 — jest-axe não publica tipos próprios; declaração mínima do que
// este repo usa. Sem import/export no topo: precisa ser um script global, não um módulo, para
// que `declare module` crie uma declaração ambiente nova em vez de tentar "aumentar" um módulo
// que o TS ainda não conhece (augmentation só funciona sobre um módulo já resolvível).
declare module "jest-axe" {
  export function axe(container: Element | Document): Promise<{ violations: unknown[] }>;
  export const toHaveNoViolations: {
    toHaveNoViolations: (received: { violations: unknown[] }) => { pass: boolean; message: () => string };
  };
}
