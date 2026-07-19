import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** @spec SPEC-20260525-001 §4.2 — mescla classes Tailwind resolvendo conflitos de utilitário. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
