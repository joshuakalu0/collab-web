import { apiError, apiSuccess } from "@/lib/http";
import { serializeDocumentSummary } from "@/lib/serialize";
import { getViewerSession } from "@/lib/session";
import { createDocumentSchema } from "@booster/collab-contracts";
import { createDocumentForOwner, getPrismaClient, listDocumentsForUser } from "@booster/database";

export const runtime = "nodejs";

export async function GET() {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before listing documents.");
  }

  const documents = (await listDocumentsForUser(session.user.id)).map(serializeDocumentSummary);

  return apiSuccess({
    documents
  });
}

export async function POST(request: Request) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before creating documents.");
  }

  const parsed = createDocumentSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(400, "validation_error", "Provide a document title between 1 and 120 characters.");
  }

  const document = await createDocumentForOwner({
    ownerId: session.user.id,
    title: parsed.data.title
  });

  if (!document) {
    return apiError(400, "invalid_request", "A personal workspace could not be prepared for this account.");
  }

  const workspace = await getPrismaClient().workspace.findUnique({
    select: {
      name: true,
      slug: true
    },
    where: {
      id: document.workspaceId
    }
  });

  if (!workspace) {
    return apiError(404, "not_found", "Workspace not found for the new document.");
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
        workspaceId: document.workspaceId,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug
      })
    },
    {
      detail: "Document created.",
      status: 201
    }
  );
}
