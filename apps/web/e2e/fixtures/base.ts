// @spec SPEC-20260716-003 RF-CFG-06, RF-CFG-08
import { test as base, expect } from "@playwright/test";

/**
 * Reexporta o `test` do Playwright — ponto de extensão reservado para futuras
 * fixtures customizadas (ex: Page Objects injetados via fixture).
 *
 * A sessão autenticada reutilizável já é resolvida via `storageState` global
 * (cookies de auth) definido em `playwright.config.ts`, não aqui. Testes que
 * validam ausência de sessão (RF-E2E-01) sobrescrevem com:
 *   `test.use({ storageState: undefined });`
 *
 * @spec SPEC-20260716-003 RF-CFG-06, RF-CFG-08
 */
export const test = base;
export { expect };
