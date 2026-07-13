"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * @spec SPEC-20260524-001 RNF-04 (WCAG 2.1 AA)
 */
export function PasswordInput(props: PasswordInputProps): ReactNode {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className="w-full pr-10" />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-2 text-sm text-gray-500"
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
