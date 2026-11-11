import { apiError, apiSuccess } from "@/lib/http";
import { requireDocumentActor } from "@/lib/api-auth";
import { syncDocumentRealtimeSnapshot } from "@/lib/internal-socket";
import { enforcePublicApiRateLimit, handleOptions } from "@/lib/public-api";
import { getPrismaClient, restoreDocumentVersion } from "@booster/database";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return handleOptions(request);
}

async function apiKeyOwnsDocument(documentId: string, workspaceId: string, createdById: string) {
  return getPrismaClient().document.findFirst({
    select: {
      id: true
    },
    where: {
      id: documentId,
      ownerId: createdById,
      workspaceId
    }
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const rateLimit = await enforcePublicApiRateLimit(request, {
    fallbackSubject: "document-restore",
    limit: 20,
    scope: "api-v1-document-restore",
    windowSeconds: 60
  });

  if (rateLimit.error) {
    return rateLimit.error;
  }

  const { id, versionId } = await params;
  const authResult = await requireDocumentActor(request, id);

  if (!authResult) {
    return apiError(401, "unauthorized", "You do not have access to that document.", {
      headers: rateLimit.headers
    });
  }

  const actorUserId =
    authResult.actor.kind === "api-key" ? authResult.actor.createdById : authResult.actor.id;

  if (authResult.actor.kind === "api-key") {
    const owned = await apiKeyOwnsDocument(id, authResult.actor.workspaceId, authResult.actor.createdById);

    if (!owned) {
      return apiError(403, "forbidden", "This API key can only restore documents owned by its creator.", {
        headers: rateLimit.headers
      });
    }
  } else if (!authResult.isOwner) {
    return apiError(403, "forbidden", "Only the document owner can restore document history.", {
      headers: rateLimit.headers
    });
  }

  const restored = await restoreDocumentVersion({
    documentId: id,
    userId: actorUserId,
    versionId
  });

  if (!restored) {
    return apiError(404, "not_found", "That document version could not be restored.", {
      headers: rateLimit.headers
    });
  }

  await syncDocumentRealtimeSnapshot({
    content: restored.content,
    documentId: restored.id,
    revision: restored.revision,
    savedAt: restored.lastSavedAt?.toISOString() ?? null,
    updatedById: actorUserId
  });

  return apiSuccess(
    {
      document: {
        id: restored.id,
        lastSavedAt: restored.lastSavedAt?.toISOString() ?? null,
        revision: restored.revision
      }
    },
    {
      headers: rateLimit.headers
    }
  );
}
