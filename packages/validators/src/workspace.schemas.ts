import { z } from "zod";

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-01
 */
export const createWorkspaceInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome obrigatório")
    .max(60, "Nome deve ter no máximo 60 caracteres"),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-03
 */
export const createInviteInputSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
});
export type CreateInviteInput = z.infer<typeof createInviteInputSchema>;

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-08
 */
export const assignVehicleInputSchema = z.object({
  memberId: z.string().uuid(),
});
export type AssignVehicleInput = z.infer<typeof assignVehicleInputSchema>;

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  role: z.enum(["workspace_owner", "workspace_member"]).optional(),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export const workspaceMemberSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  joined_at: z.string(),
  removed_at: z.string().nullable(),
});
export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;

export const workspaceInviteSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  status: z.enum(["pending", "accepted", "revoked", "expired"]),
  expires_at: z.string(),
  inviteUrl: z.string().url().optional(),
});
export type WorkspaceInvite = z.infer<typeof workspaceInviteSchema>;
