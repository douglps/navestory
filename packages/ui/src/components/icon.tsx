import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";

export type IconSize = "xs" | "sm" | "md" | "lg";

export type IconColor =
  | "default"
  | "muted"
  | "primary"
  | "success"
  | "danger"
  | "warning"
  | "info";

export interface IconProps {
  /** Componente Lucide a renderizar. Ex.: `icon={Car}` */
  icon: LucideIcon;
  size?: IconSize;
  color?: IconColor;
  className?: string;
  /**
   * Texto alternativo para ícone funcional.
   * Quando fornecido, adiciona `role="img"` e `aria-label` — o ícone passa a transmitir
   * significado e precisa ter descrição acessível.
   * Omitir para ícones puramente decorativos (aplica `aria-hidden="true"` automaticamente).
   */
  "aria-label"?: string;
}

const sizeValueMap: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
};

// Classes Tailwind `size-*` usadas em conjunto com `size` numérico do Lucide,
// garantindo que o hit-area e o layout sejam consistentes.
const sizeClassMap: Record<IconSize, string> = {
  xs: "size-3",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

const colorClassMap: Record<IconColor, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
};

/**
 * Wrapper sobre ícones Lucide com tokens semânticos de tamanho e cor.
 *
 * Acessibilidade:
 * - Ícone decorativo (sem `aria-label`): `aria-hidden="true"` — ignorado por leitores de tela.
 * - Ícone funcional (com `aria-label`): `role="img"` + `aria-label` — anunciado ao usuário.
 *
 * Uso:
 * ```tsx
 * // Decorativo (ao lado de texto que já descreve a ação)
 * <Icon icon={Car} size="sm" color="muted" />
 *
 * // Funcional (botão de ícone sem label visível)
 * <Icon icon={AlertTriangle} size="md" color="danger" aria-label="Alerta de manutenção" />
 * ```
 */
export function Icon({
  icon: IconComponent,
  size = "md",
  color = "default",
  className,
  "aria-label": ariaLabel,
}: IconProps) {
  const isFunctional = Boolean(ariaLabel);

  return (
    <IconComponent
      size={sizeValueMap[size]}
      aria-hidden={isFunctional ? undefined : true}
      aria-label={ariaLabel}
      role={isFunctional ? "img" : undefined}
      className={cn(colorClassMap[color], sizeClassMap[size], className)}
    />
  );
}
