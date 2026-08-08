"use client";

import { type HTMLAttributes, type ReactNode, forwardRef } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { cn } from "../lib/cn";
import { Button, type ButtonProps } from "./button";

/**
 * @spec SPEC-20260807-003 S17
 * Construído sobre o mesmo primitivo `@radix-ui/react-dialog` de `dialog.tsx` (RNF-05 —
 * não criar implementações paralelas de modal); `role="alertdialog"` sinaliza a a11y de
 * confirmação de ação crítica sem exigir a dependência separada `@radix-ui/react-alert-dialog`
 * para uma diferença de comportamento (bloqueio de fechamento por clique fora) que este uso
 * não precisa — a segurança real vem do botão de confirmação desabilitado até a validação
 * passar (ex: digitação da placa), não do bloqueio de dismissal do overlay.
 */
export const AlertDialog = RadixDialog.Root;
export const AlertDialogTrigger = RadixDialog.Trigger;
export const AlertDialogClose = RadixDialog.Close;

export interface AlertDialogContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const AlertDialogContent = forwardRef<HTMLDivElement, AlertDialogContentProps>(
  ({ className, children, ...props }, ref) => (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:duration-150" />
      <RadixDialog.Content
        ref={ref}
        role="alertdialog"
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
      </RadixDialog.Content>
    </RadixDialog.Portal>
  ),
);
AlertDialogContent.displayName = "AlertDialogContent";

export function AlertDialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn("mb-4 flex flex-col gap-1.5", className)} {...props} />;
}

export function AlertDialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export const AlertDialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <RadixDialog.Title
      ref={ref}
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  ),
);
AlertDialogTitle.displayName = "AlertDialogTitle";

export const AlertDialogDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

/** Botão de confirmação — não fecha automaticamente o diálogo; o handler decide (ex: só após sucesso da mutation). */
export const AlertDialogAction = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "destructive", ...props }, ref) => (
    <Button ref={ref} type="button" variant={variant} {...props} />
  ),
);
AlertDialogAction.displayName = "AlertDialogAction";

export const AlertDialogCancel = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "outline", ...props }, ref) => (
    <RadixDialog.Close asChild>
      <Button ref={ref} type="button" variant={variant} {...props} />
    </RadixDialog.Close>
  ),
);
AlertDialogCancel.displayName = "AlertDialogCancel";
