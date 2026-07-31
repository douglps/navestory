import type { HTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * @spec SPEC-20260730-001 RF-03 — substitui `<main className="mx-auto flex max-w-{size}
 * flex-col gap-{n} p-8">`, idêntico em 32 ocorrências através de quase toda rota `page.tsx`.
 */
const containerVariants = cva("mx-auto flex w-full flex-col p-8", {
  variants: {
    size: {
      sm: "max-w-sm",
      md: "max-w-md",
      "2xl": "max-w-2xl",
      "3xl": "max-w-3xl",
      "4xl": "max-w-4xl",
      "5xl": "max-w-5xl",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

export interface ContainerProps
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof containerVariants> {
  gap?: 4 | 8;
}

export function Container({ className, size, gap = 4, ...props }: ContainerProps): ReactNode {
  return (
    <main
      className={cn(containerVariants({ size }), gap === 8 ? "gap-8" : "gap-4", className)}
      {...props}
    />
  );
}
