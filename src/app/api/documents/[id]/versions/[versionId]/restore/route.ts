import { apiError, apiSuccess } from "@/lib/http";
import { syncDocumentRealtimeSnapshot } from "@/lib/internal-socket";
import { getViewerSession } from "@/lib/session";
import { restoreDocumentVersion } from "@booster/database";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before restoring document history.");
  }

  const { id, versionId } = await params;
  const restored = await restoreDocumentVersion({
    documentId: id,
    userId: session.user.id,
    versionId
  });

  if (!restored) {
    return apiError(403, "forbidden", "Only the document owner can restore versions.");
  }

  await syncDocumentRealtimeSnapshot({
    content: restored.content,
    documentId: restored.id,
    revision: restored.revision,
    savedAt: restored.lastSavedAt?.toISOString() ?? null,
    updatedById: session.user.id
  });

  return apiSuccess({
    document: {
      id: restored.id,
      lastSavedAt: restored.lastSavedAt?.toISOString() ?? null,
      revision: restored.revision
    }
  });
}
