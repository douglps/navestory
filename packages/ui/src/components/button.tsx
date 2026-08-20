"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/** @spec SPEC-20260525-001 §4.2 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium " +
    "transition-colors disabled:pointer-events-none disabled:opacity-50 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-border bg-transparent hover:bg-muted",
        ghost: "bg-transparent hover:bg-muted",
        destructive: "bg-danger text-danger-foreground hover:bg-danger/90",
      },
      size: {
        // touch target mínimo 44px em mobile (§4.1/spacingTokens.touchTarget), compactado em md:
        sm: "h-10 px-3 text-sm md:h-8",
        md: "h-11 px-4 text-sm md:h-10",
        lg: "h-11 px-6 text-base md:h-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  /**
   * Quando `true`, o Button delega a renderização ao seu filho direto (ex: Link do Next.js),
   * mesclando classes e eventos — evita aninhamento inválido de <a><button>. Baseado no
   * padrão Radix Slot. Incompatível com `loading` (ignorado quando asChild=true).
   */
  asChild?: boolean;
}

/** @spec SPEC-20260525-001 §4.2 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading = false, disabled, asChild = false, children, ...props },
    ref,
  ) => {
    const variantClass = cn(buttonVariants({ variant, size }), className);

    if (asChild) {
      // Slot mescla as props (className, onClick, etc.) com o filho direto.
      // `loading` é ignorado nesse modo — o elemento filho controla seu próprio estado.
      return (
        <Slot ref={ref} className={variantClass} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={variantClass}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
