"use client";

import { type HTMLAttributes, type ReactNode, forwardRef } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { cn } from "../lib/cn";

/**
 * @spec SPEC-20260719-001 RF-01, RF-02
 * `@radix-ui/react-dialog` como primitivo headless — mesma família Radix já usada em
 * `tabs.tsx`/`combobox.tsx`. Substitui o uso ad hoc de `@radix-ui/react-dialog` direto em
 * `apps/web/src/components/layout/vehicle-context-dialog.tsx` (estilos fora do design
 * system, ex: `bg-white`/`border-neutral-200` em vez de tokens `bg-card`/`border-border`).
 * Focus-trap, `Esc` para fechar e `aria-labelledby`/`aria-describedby` (via `DialogTitle`/
 * `DialogDescription`) vêm de graça do Radix — não precisam ser reimplementados aqui.
 */
export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Oculta o botão "X" padrão de fechar — usar quando o fechamento é só via ações explícitas. */
  hideCloseButton?: boolean;
}

/** @spec SPEC-20260719-001 RF-01, RF-02 */
export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, hideCloseButton = false, ...props }, ref) => (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:duration-150" />
      <RadixDialog.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-[201] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
          "rounded-lg border border-border bg-card p-6 text-card-foreground shadow-xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:duration-150",
          "focus-visible:outline-none",
          className,
        )}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <RadixDialog.Close
            aria-label="Fechar"
            className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  ),
);
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn("mb-4 flex flex-col gap-1.5 pr-6", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export const DialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <RadixDialog.Title
      ref={ref}
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  ),
);
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <RadixDialog.Description
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  ),
);
DialogDescription.displayName = "DialogDescription";
