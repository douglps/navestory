import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** @spec SPEC-20260525-001 §6.2 — sem prop de ícone dedicada (§4.3); separador tipográfico simples. */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  maxItems?: number;
  className?: string;
}

const ELLIPSIS = Symbol("ellipsis");
type BreadcrumbNode = BreadcrumbItem | typeof ELLIPSIS;

function collapseItems(items: BreadcrumbItem[], maxItems: number | undefined): BreadcrumbNode[] {
  if (!maxItems || items.length <= maxItems) return items;

  const first = items[0];
  const tailCount = Math.max(1, maxItems - 2);
  const tail = items.slice(items.length - tailCount);

  return first ? [first, ELLIPSIS, ...tail] : [ELLIPSIS, ...tail];
}

/** @spec SPEC-20260525-001 §6.2 */
export function Breadcrumb({ items, maxItems, className }: BreadcrumbProps): ReactNode {
  const nodes = collapseItems(items, maxItems);

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {nodes.map((node, index) => {
          const isLast = index === nodes.length - 1;

          if (node === ELLIPSIS) {
            return (
              <li key="ellipsis" aria-hidden="true" className="flex items-center gap-1.5">
                <span>…</span>
                {!isLast && <span>/</span>}
              </li>
            );
          }

          return (
            <li key={`${node.label}-${index}`} className="flex items-center gap-1.5">
              {node.href && !isLast ? (
                <a
                  href={node.href}
                  className={cn(
                    "flex items-center gap-1 transition-colors hover:text-foreground hover:underline",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-sm",
                  )}
                >
                  {node.icon && <span aria-hidden="true">{node.icon}</span>}
                  {node.label}
                </a>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn("flex items-center gap-1", isLast && "font-medium text-foreground")}
                >
                  {node.icon && <span aria-hidden="true">{node.icon}</span>}
                  {node.label}
                </span>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
