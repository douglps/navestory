import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * @spec SPEC-20260525-001 §4.2, §9.1
 * Primitivos do padrão "two-row table" (§9.1): células com `align-top` por padrão e
 * `TableRow` com prop `striped` para a zebra striping (`bg-muted/15` nas linhas ímpares),
 * já que o índice da linha só o consumidor conhece — `<TableRow striped={idx % 2 === 1}>`.
 */

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("border-b border-border [&_tr]:align-top", className)} {...props} />
  ),
);
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn(className)} {...props} />,
);
TableBody.displayName = "TableBody";

const tableRowVariants = cva("border-b border-border transition-colors hover:bg-muted/50", {
  variants: {
    striped: {
      true: "bg-muted/15",
      false: "",
    },
  },
  defaultVariants: {
    striped: false,
  },
});

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement>, VariantProps<typeof tableRowVariants> {}

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, striped, ...props }, ref) => (
    <tr ref={ref} className={cn(tableRowVariants({ striped }), className)} {...props} />
  ),
);
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn("h-10 px-3 text-left align-top font-medium text-muted-foreground", className)}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-3 py-2 align-top", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";
