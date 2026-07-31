import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@nave/ui";

/**
 * @spec SPEC-20260731-008 RF-09, CA-06
 */
export default function ForbiddenPage(): ReactNode {
  return (
    <Container size="sm" gap={4}>
      <h1 className="text-xl font-semibold">Acesso negado</h1>
      <p className="text-muted-foreground">
        Você não tem permissão para acessar esta página. Se você acredita que isso é um erro,
        entre em contato com um administrador.
      </p>
      <Link href="/dashboard" className="text-primary underline">
        Voltar para o painel
      </Link>
    </Container>
  );
}
