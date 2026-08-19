import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Container, Icon } from "@navestory/ui";

/**
 * @spec SPEC-20260813-001 RF-21 — placeholder mínimo, sem fluxo de billing: existe apenas para
 * o Link "Upgrade" da sidebar não resultar em 404. Conteúdo definitivo é escopo da spec de
 * monetização da Fase 9 (R-NAV-13).
 */
export default function UpgradePage(): ReactNode {
  return (
    <Container size="2xl" gap={4}>
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon icon={Sparkles} size="lg" color="primary" />
        <h1 className="text-xl font-semibold">Planos pagos em breve</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Estamos preparando planos pagos com recursos adicionais para o navestory. Nenhuma ação
          é necessária por enquanto — sua conta continua funcionando normalmente.
        </p>
      </div>
    </Container>
  );
}
