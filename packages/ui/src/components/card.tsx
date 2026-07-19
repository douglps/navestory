import { type HTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/** @spec SPEC-20260525-001 §4.2 */
const cardVariants = cva("rounded-lg border border-border bg-card text-card-foreground shadow-sm", {
  variants: {
    padding: {
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: {
    padding: "md",
  },
});

export interface CardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

/** @spec SPEC-20260525-001 §4.2 */
export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, padding, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ padding }), className)} {...props} />
));

Card.displayName = "Card";
