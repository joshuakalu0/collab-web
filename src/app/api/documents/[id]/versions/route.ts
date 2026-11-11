import { apiError, apiSuccess } from "@/lib/http";
import { getViewerSession } from "@/lib/session";
import { listDocumentVersions } from "@booster/database";
import { documentVersionSchema } from "@booster/collab-contracts";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before reading document versions.");
  }

  const { id } = await params;
  const versions = await listDocumentVersions({
    documentId: id,
    userId: session.user.id
  });

  if (!versions) {
    return apiError(404, "not_found", "Document not found or not shared with you.");
  }

  return apiSuccess({
    versions: versions.map((version) =>
      documentVersionSchema.parse({
        ...version,
        savedAt: version.savedAt.toISOString()
      })
    )
  });
}
