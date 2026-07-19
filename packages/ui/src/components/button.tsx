"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
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
}

/** @spec SPEC-20260525-001 §4.2 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
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
