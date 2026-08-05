"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface MyWorkspace {
  id: string;
  role: "workspace_owner" | "workspace_member";
}

interface DriverSettings {
  requireCnhNumber: boolean;
  requireCnhExpiry: boolean;
  requireCnhCategory: boolean;
  requirePhone: boolean;
}

interface MemberProfile {
  cnhNumber: string | null;
  cnhCategory: string | null;
  cnhExpiresAt: string | null;
  phone: string | null;
}

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-05
 * Indicador persistente de cadastro incompleto — mesmo padrão de `InstallPromptBanner`
 * (fixed, dismissível pela navegação, sem estado de dismiss próprio porque a pendência
 * real só some quando o cadastro é de fato completado).
 */
export function ProfileIncompleteBanner(): ReactNode {
  const pathname = usePathname();

  const workspaceQuery = useQuery({
    queryKey: ["workspaces", "me"],
    queryFn: () => apiClient<MyWorkspace>("/workspaces/me"),
    retry: false,
  });
  const isMember = workspaceQuery.data?.role === "workspace_member";
  const workspaceId = workspaceQuery.data?.id;

  const settingsQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "driver-settings"],
    queryFn: () => apiClient<DriverSettings>(`/workspaces/${workspaceId}/driver-settings`),
    enabled: isMember && workspaceId !== undefined,
  });
  const profileQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "members", "me", "profile"],
    queryFn: () => apiClient<MemberProfile | null>(`/workspaces/${workspaceId}/members/me/profile`),
    enabled: isMember && workspaceId !== undefined,
  });

  if (!isMember || pathname?.startsWith("/workspace") || !settingsQuery.data) {
    return null;
  }

  const settings = settingsQuery.data;
  const profile = profileQuery.data;
  const isIncomplete =
    (settings.requireCnhNumber && !profile?.cnhNumber) ||
    (settings.requireCnhCategory && !profile?.cnhCategory) ||
    (settings.requireCnhExpiry && !profile?.cnhExpiresAt) ||
    (settings.requirePhone && !profile?.phone);

  if (!isIncomplete) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-[150] flex items-center gap-3 rounded-md border border-warning bg-warning-pastel px-4 py-3 text-sm shadow-lg"
    >
      <span>Seu cadastro de motorista está incompleto.</span>
      <Link href="/workspace/onboarding" className="font-medium text-primary underline">
        Completar agora
      </Link>
    </div>
  );
}
