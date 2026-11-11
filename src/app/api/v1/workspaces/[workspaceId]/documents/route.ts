import { apiError, apiSuccess } from "@/lib/http";
import { requireWorkspaceActor } from "@/lib/api-auth";
import { enforcePublicApiRateLimit, handleOptions } from "@/lib/public-api";
import { serializeDocumentSummary } from "@/lib/serialize";
import { createDocumentSchema } from "@booster/collab-contracts";
import {
  createDocumentInWorkspace,
  getPrismaClient,
  listWorkspaceDocumentsForUser
} from "@booster/database";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return handleOptions(request);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const rateLimit = await enforcePublicApiRateLimit(request, {
    fallbackSubject: "workspace-documents",
    limit: 120,
    scope: "api-v1-workspace-documents-read",
    windowSeconds: 60
  });

  if (rateLimit.error) {
    return rateLimit.error;
  }

  const { workspaceId } = await params;
  const authResult = await requireWorkspaceActor(request, workspaceId);

  if (!authResult) {
    return apiError(401, "unauthorized", "You do not have access to that workspace.", {
      headers: rateLimit.headers
    });
  }

  if ("actor" in authResult && authResult.actor.kind === "session") {
    const documents = await listWorkspaceDocumentsForUser({
      userId: authResult.actor.id,
      workspaceId
    });

    return apiSuccess(
      {
        documents: (documents ?? []).map(serializeDocumentSummary)
      },
      {
        headers: rateLimit.headers
      }
    );
  }

  const documents = await getPrismaClient().document.findMany({
    include: {
      collaborators: {
        select: {
          userId: true
        }
      },
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    },
    where: {
      workspaceId
    }
  });

  return apiSuccess(
    {
      documents: documents.map((document) =>
        serializeDocumentSummary({
          access: "EDIT",
          collaboratorCount: document.collaborators.length,
          id: document.id,
          isOwner: document.ownerId === authResult.createdById,
          lastSavedAt: document.lastSavedAt,
          preview: document.content.slice(0, 140),
          shared: document.ownerId !== authResult.createdById,
          title: document.title,
          updatedAt: document.updatedAt,
          workspaceId: document.workspace.id,
          workspaceName: document.workspace.name,
          workspaceSlug: document.workspace.slug
        })
      )
    },
    {
      headers: rateLimit.headers
    }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const rateLimit = await enforcePublicApiRateLimit(request, {
    fallbackSubject: "workspace-documents-write",
    limit: 30,
    scope: "api-v1-workspace-documents-write",
    windowSeconds: 60
  });

  if (rateLimit.error) {
    return rateLimit.error;
  }

  const { workspaceId } = await params;
  const authResult = await requireWorkspaceActor(request, workspaceId);

  if (!authResult) {
    return apiError(401, "unauthorized", "You do not have access to that workspace.", {
      headers: rateLimit.headers
    });
  }

  const parsed = createDocumentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(400, "validation_error", "Provide a title between 1 and 120 characters.", {
      headers: rateLimit.headers
    });
  }

  const userId =
    "actor" in authResult && authResult.actor.kind === "session"
      ? authResult.actor.id
      : authResult.createdById;

  const document = await createDocumentInWorkspace({
    title: parsed.data.title,
    userId,
    workspaceId
  });

  if (!document) {
    return apiError(403, "forbidden", "A document could not be created in that workspace.", {
      headers: rateLimit.headers
    });
  }

  const workspace = await getPrismaClient().workspace.findUnique({
    select: {
      name: true,
      slug: true
    },
    where: {
      id: workspaceId
    }
  });

  if (!workspace) {
    return apiError(404, "not_found", "Workspace not found.", {
      headers: rateLimit.headers
    });
  }

  return apiSuccess(
    {
      document: serializeDocumentSummary({
        access: "EDIT",
        collaboratorCount: 0,
        id: document.id,
        isOwner: true,
        lastSavedAt: document.lastSavedAt,
        preview: "",
        shared: false,
        title: document.title,
        updatedAt: document.updatedAt,
        workspaceId,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug
      })
    },
    {
      headers: rateLimit.headers,
      status: 201
    }
  );
}
