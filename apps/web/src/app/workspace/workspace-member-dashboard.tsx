"use client";

import { Container } from "@navestory/ui";
import Link from "next/link";
import type { ReactNode } from "react";

interface WorkspaceMemberDashboardProps {
  workspaceName: string;
}

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-04, RF-05
 */
export function WorkspaceMemberDashboard({ workspaceName }: WorkspaceMemberDashboardProps): ReactNode {
  return (
    <Container size="5xl" gap={4}>
      <h2 className="text-lg font-semibold">Você faz parte de {workspaceName}</h2>
      <p className="text-sm text-muted-foreground">
        Complete seu cadastro de motorista para começar a usar os veículos atribuídos a você.
      </p>
      <Link href="/workspace/onboarding" className="text-sm text-primary underline">
        Completar meu cadastro
      </Link>
    </Container>
  );
}
