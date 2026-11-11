import { apiError, apiSuccess } from "@/lib/http";
import { getViewerSession } from "@/lib/session";
import { collaboratorAccessUpdateSchema } from "@booster/collab-contracts";
import { removeCollaborator, updateCollaboratorAccess } from "@booster/database";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before managing collaborators.");
  }

  const parsed = collaboratorAccessUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(400, "validation_error", "Provide a valid access level.");
  }

  const { id, userId } = await params;
  const updated = await updateCollaboratorAccess({
    access: parsed.data.access,
    collaboratorUserId: userId,
    documentId: id,
    ownerId: session.user.id
  });

  if (!updated) {
    return apiError(403, "forbidden", "Only the owner can change collaborator access.");
  }

  return apiSuccess({
    collaborator: {
      access: updated.access,
      userId: updated.userId
    }
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before managing collaborators.");
  }

  const { id, userId } = await params;
  const removed = await removeCollaborator({
    collaboratorUserId: userId,
    documentId: id,
    ownerId: session.user.id
  });

  if (!removed) {
    return apiError(403, "forbidden", "Only the owner can remove collaborators.");
  }

  return apiSuccess({
    removed: true
  });
}
