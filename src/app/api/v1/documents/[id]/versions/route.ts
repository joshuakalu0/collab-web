import { apiError, apiSuccess } from "@/lib/http";
import { requireDocumentActor } from "@/lib/api-auth";
import { enforcePublicApiRateLimit, handleOptions } from "@/lib/public-api";
import { documentVersionSchema } from "@booster/collab-contracts";
import { getPrismaClient, listDocumentVersions } from "@booster/database";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return handleOptions(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimit = await enforcePublicApiRateLimit(request, {
    fallbackSubject: "document-versions",
    limit: 120,
    scope: "api-v1-document-versions",
    windowSeconds: 60
  });

  if (rateLimit.error) {
    return rateLimit.error;
  }

  const { id } = await params;
  const authResult = await requireDocumentActor(request, id);

  if (!authResult) {
    return apiError(401, "unauthorized", "You do not have access to that document.", {
      headers: rateLimit.headers
    });
  }

  if (authResult.actor.kind === "api-key") {
    const document = await getPrismaClient().document.findUnique({
      select: {
        workspaceId: true
      },
      where: {
        id
      }
    });

    if (!document || document.workspaceId !== authResult.actor.workspaceId) {
      return apiError(404, "not_found", "Document not found.", {
        headers: rateLimit.headers
      });
    }

    const versions = await getPrismaClient().documentVersion.findMany({
      include: {
        savedBy: {
          select: {
            email: true,
            id: true,
            image: true,
            name: true
          }
        }
      },
        orderBy: {
          savedAt: "desc"
        },
      where: {
        documentId: id
      }
    });

    return apiSuccess(
      {
        versions: versions.map((version) =>
          documentVersionSchema.parse({
            content: version.content,
            contentHash: version.contentHash,
            documentId: version.documentId,
            id: version.id,
            revision: version.revision,
            savedAt: version.savedAt.toISOString(),
            savedBy: version.savedBy
              ? {
                  email: version.savedBy.email,
                  id: version.savedBy.id,
                  image: version.savedBy.image,
                  name: version.savedBy.name
                }
              : null
          })
        )
      },
      {
        headers: rateLimit.headers
      }
    );
  }

  const versions = await listDocumentVersions({
    documentId: id,
    userId: authResult.actor.id
  });

  if (!versions) {
    return apiError(404, "not_found", "Document not found.", {
      headers: rateLimit.headers
    });
  }

  return apiSuccess(
    {
      versions: versions.map((version) =>
        documentVersionSchema.parse({
          ...version,
          savedAt: version.savedAt.toISOString()
        })
      )
    },
    {
      headers: rateLimit.headers
    }
  );
}
