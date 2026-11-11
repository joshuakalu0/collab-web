import { apiError, apiSuccess } from "@/lib/http";
import { getViewerSession } from "@/lib/session";
import { workspaceMemberRoleUpdateSchema } from "@booster/collab-contracts";
import { getWorkspaceForUser, removeWorkspaceMember, updateWorkspaceMemberRole } from "@booster/database";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before managing workspace members.");
  }

  const parsed = workspaceMemberRoleUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(400, "validation_error", "Provide a valid workspace role.");
  }

  const { slug, userId } = await params;
  const workspace = await getWorkspaceForUser({
    slug,
    userId: session.user.id
  });

  if (!workspace) {
    return apiError(404, "not_found", "Workspace not found.");
  }

  const updated = await updateWorkspaceMemberRole({
    actorUserId: session.user.id,
    role: parsed.data.role,
    targetUserId: userId,
    workspaceId: workspace.id
  });

  if (!updated) {
    return apiError(403, "forbidden", "You do not have permission to change that workspace role.");
  }

  return apiSuccess({
    member: {
      email: updated.user.email,
      id: updated.user.id,
      image: updated.user.image,
      name: updated.user.name,
      role: updated.role
    }
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before managing workspace members.");
  }

  const { slug, userId } = await params;
  const workspace = await getWorkspaceForUser({
    slug,
    userId: session.user.id
  });

  if (!workspace) {
    return apiError(404, "not_found", "Workspace not found.");
  }

  const removed = await removeWorkspaceMember({
    actorUserId: session.user.id,
    targetUserId: userId,
    workspaceId: workspace.id
  });

  if (!removed) {
    return apiError(403, "forbidden", "You do not have permission to remove that workspace member.");
  }

  if (removed.reason === "self") {
    return apiError(400, "invalid_request", "Use a dedicated leave-workspace flow instead of removing yourself here.");
  }

  if (removed.reason === "forbidden") {
    return apiError(403, "forbidden", "You do not have permission to remove that workspace member.");
  }

  return apiSuccess({
    removed: true
  });
}
