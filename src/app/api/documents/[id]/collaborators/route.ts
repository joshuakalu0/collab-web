import { apiError, apiSuccess } from "@/lib/http";
import { serializeCollaborator } from "@/lib/serialize";
import { getViewerSession } from "@/lib/session";
import { collaboratorMutationSchema } from "@booster/collab-contracts";
import { getDocumentSharingState, grantCollaboratorAccess } from "@booster/database";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before reading collaborators.");
  }

  const { id } = await params;
  const sharing = await getDocumentSharingState({
    documentId: id,
    userId: session.user.id
  });

  if (!sharing) {
    return apiError(404, "not_found", "Document not found or not shared with you.");
  }

  return apiSuccess({
    collaborators: sharing.collaborators.map(serializeCollaborator),
    members: sharing.members
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before managing collaborators.");
  }

  const parsed = collaboratorMutationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(400, "validation_error", "Provide a workspace member and access level.");
  }

  const { id } = await params;
  const result = await grantCollaboratorAccess({
    access: parsed.data.access,
    collaboratorUserId: parsed.data.userId,
    documentId: id,
    ownerId: session.user.id
  });

  if (!result) {
    return apiError(404, "not_found", "The document could not be found.");
  }

  if (result.reason === "owner") {
    return apiError(400, "invalid_request", "The owner already has full access.");
  }

  if (result.reason === "user_not_found") {
    return apiError(404, "not_found", "That user account could not be found.");
  }

  if (result.reason === "workspace_membership_required") {
    return apiError(400, "invalid_request", "Only existing workspace members can be granted document access.");
  }

  return apiSuccess(
    {
      collaborator: serializeCollaborator(result.result)
    },
    {
      detail: "Collaborator access saved.",
      status: 201
    }
  );
}
