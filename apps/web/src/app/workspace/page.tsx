"use client";

import { Skeleton } from "@navestory/ui";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/http/api-client";
import { apiClient } from "@/lib/http/api-client";
import { CreateWorkspaceForm } from "./create-workspace-form";
import { WorkspaceMemberDashboard } from "./workspace-member-dashboard";
import { WorkspaceOwnerDashboard } from "./workspace-owner-dashboard";

interface MyWorkspace {
  id: string;
  name: string;
  role: "workspace_owner" | "workspace_member";
}

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-02, RF-12
 */
export default function WorkspacePage(): ReactNode {
  const { data, isLoading, error } = useQuery({
    queryKey: ["workspaces", "me"],
    queryFn: () => apiClient<MyWorkspace>("/workspaces/me"),
    retry: false,
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (error instanceof ApiError && error.statusCode === 404) {
    return <CreateWorkspaceForm />;
  }

  if (!data) {
    return <CreateWorkspaceForm />;
  }

  if (data.role === "workspace_owner") {
    return <WorkspaceOwnerDashboard workspaceId={data.id} workspaceName={data.name} />;
  }

  return <WorkspaceMemberDashboard workspaceName={data.name} />;
}
