import { apiError, apiSuccess } from "@/lib/http";
import { serializeDocumentDetail } from "@/lib/serialize";
import { getViewerSession } from "@/lib/session";
import { updateDocumentSchema } from "@booster/collab-contracts";
import { deleteDocument, getAccessibleDocument, updateDocumentTitle } from "@booster/database";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before reading documents.");
  }

  const { id } = await params;
  const document = await getAccessibleDocument({
    documentId: id,
    userId: session.user.id
  });

  if (!document) {
    return apiError(404, "not_found", "Document not found or not shared with you.");
  }

  return apiSuccess({
    document: serializeDocumentDetail(document)
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before updating documents.");
  }

  const parsed = updateDocumentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(400, "validation_error", "Provide a title between 1 and 120 characters.");
  }

  const { id } = await params;
  const updated = await updateDocumentTitle({
    documentId: id,
    title: parsed.data.title,
    userId: session.user.id
  });

  if (!updated) {
    return apiError(403, "forbidden", "Only the owner can rename this document.");
  }

  return apiSuccess({
    document: {
      id: updated.id,
      title: updated.title
    }
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before deleting documents.");
  }

  const { id } = await params;
  const deleted = await deleteDocument({
    documentId: id,
    userId: session.user.id
  });

  if (!deleted) {
    return apiError(403, "forbidden", "Only the owner can delete this document.");
  }

  return apiSuccess({
    deleted: true
  });
}
