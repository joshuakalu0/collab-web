import { apiError, apiSuccess } from "@/lib/http";
import { requireDocumentActor } from "@/lib/api-auth";
import { enforcePublicApiRateLimit, handleOptions } from "@/lib/public-api";
import { serializeDocumentDetail } from "@/lib/serialize";
import { documentDetailSchema, updateDocumentSchema } from "@booster/collab-contracts";
import {
  deleteDocument,
  getAccessibleDocument,
  getPrismaClient,
  updateDocumentTitle
} from "@booster/database";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return handleOptions(request);
}

async function buildApiKeyDocumentView(documentId: string, workspaceId: string, createdById: string) {
  const document = await getPrismaClient().document.findUnique({
    include: {
      collaborators: {
        include: {
          user: {
            select: {
              email: true,
              id: true,
              image: true,
              name: true
            }
          }
        }
      },
      versions: {
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
        take: 50
      },
      workspace: {
        include: {
          memberships: {
            select: {
              role: true,
              userId: true
            }
          }
        }
      }
    },
    where: {
      id: documentId
    }
  });

  if (!document || document.workspaceId !== workspaceId) {
    return null;
  }

  const rolesByUserId = new Map(document.workspace.memberships.map((membership) => [membership.userId, membership.role]));

  return documentDetailSchema.parse({
    access: "EDIT",
    collaborators: document.collaborators.map((collaborator) => ({
      access: collaborator.access,
      email: collaborator.user.email,
      id: collaborator.user.id,
      image: collaborator.user.image,
      name: collaborator.user.name,
      workspaceRole: rolesByUserId.get(collaborator.userId) ?? "MEMBER"
    })),
    content: document.content,
    contentHash: document.contentHash,
    id: document.id,
    isOwner: document.ownerId === createdById,
    lastSavedAt: document.lastSavedAt?.toISOString() ?? null,
    ownerId: document.ownerId,
    revision: document.revision,
    title: document.title,
    updatedAt: document.updatedAt.toISOString(),
    versions: document.versions.map((version) => ({
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
    })),
    workspaceId: document.workspaceId,
    workspaceName: document.workspace.name,
    workspaceRole: "ADMIN",
    workspaceSlug: document.workspace.slug
  });
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimit = await enforcePublicApiRateLimit(request, {
    fallbackSubject: "documents-read",
    limit: 120,
    scope: "api-v1-documents-read",
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
    const document = await buildApiKeyDocumentView(id, authResult.actor.workspaceId, authResult.actor.createdById);

    if (!document) {
      return apiError(404, "not_found", "Document not found.", {
        headers: rateLimit.headers
      });
    }

    return apiSuccess(
      {
        document
      },
      {
        headers: rateLimit.headers
      }
    );
  }

  const document = await getAccessibleDocument({
    documentId: id,
    userId: authResult.actor.id
  });

  if (!document) {
    return apiError(404, "not_found", "Document not found.", {
      headers: rateLimit.headers
    });
  }

  return apiSuccess(
    {
      document: serializeDocumentDetail(document)
    },
    {
      headers: rateLimit.headers
    }
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimit = await enforcePublicApiRateLimit(request, {
    fallbackSubject: "documents-write",
    limit: 30,
    scope: "api-v1-documents-write",
    windowSeconds: 60
  });

  if (rateLimit.error) {
    return rateLimit.error;
  }

  const parsed = updateDocumentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(400, "validation_error", "Provide a title between 1 and 120 characters.", {
      headers: rateLimit.headers
    });
  }

  const { id } = await params;
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
      return apiError(403, "forbidden", "This API key can only rename documents owned by its creator.", {
        headers: rateLimit.headers
      });
    }
  } else if (!authResult.isOwner) {
    return apiError(403, "forbidden", "Only the document owner can rename this document.", {
      headers: rateLimit.headers
    });
  }

  const document = await updateDocumentTitle({
    documentId: id,
    title: parsed.data.title,
    userId: actorUserId
  });

  if (!document) {
    return apiError(403, "forbidden", "Only the document owner can rename this document.", {
      headers: rateLimit.headers
    });
  }

  return apiSuccess(
    {
      document: {
        id: document.id,
        title: document.title
      }
    },
    {
      headers: rateLimit.headers
    }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimit = await enforcePublicApiRateLimit(request, {
    fallbackSubject: "documents-delete",
    limit: 20,
    scope: "api-v1-documents-delete",
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

  const actorUserId =
    authResult.actor.kind === "api-key" ? authResult.actor.createdById : authResult.actor.id;

  if (authResult.actor.kind === "api-key") {
    const owned = await apiKeyOwnsDocument(id, authResult.actor.workspaceId, authResult.actor.createdById);

    if (!owned) {
      return apiError(403, "forbidden", "This API key can only delete documents owned by its creator.", {
        headers: rateLimit.headers
      });
    }
  } else if (!authResult.isOwner) {
    return apiError(403, "forbidden", "Only the document owner can delete this document.", {
      headers: rateLimit.headers
    });
  }

  const deleted = await deleteDocument({
    documentId: id,
    userId: actorUserId
  });

  if (!deleted) {
    return apiError(403, "forbidden", "Only the document owner can delete this document.", {
      headers: rateLimit.headers
    });
  }

  return apiSuccess(
    {
      deleted: true
    },
    {
      headers: rateLimit.headers
    }
  );
}
