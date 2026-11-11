import { apiError, apiSuccess } from "@/lib/http";
import { getViewerSession } from "@/lib/session";
import { apiKeyCreateSchema, apiKeySummarySchema } from "@booster/collab-contracts";
import { createWorkspaceApiKey, getWorkspaceForUser, listWorkspaceApiKeys } from "@booster/database";

export const runtime = "nodejs";

function serializeApiKey(apiKey: NonNullable<Awaited<ReturnType<typeof listWorkspaceApiKeys>>>[number]) {
  return apiKeySummarySchema.parse({
    createdAt: apiKey.createdAt.toISOString(),
    createdBy: {
      email: apiKey.createdBy.email,
      id: apiKey.createdBy.id,
      image: apiKey.createdBy.image,
      name: apiKey.createdBy.name
    },
    id: apiKey.id,
    keyPrefix: apiKey.keyPrefix,
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
    name: apiKey.name,
    revokedAt: apiKey.revokedAt?.toISOString() ?? null,
    workspaceId: apiKey.workspaceId
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before reading workspace API keys.");
  }

  const { slug } = await params;
  const workspace = await getWorkspaceForUser({
    slug,
    userId: session.user.id
  });

  if (!workspace) {
    return apiError(404, "not_found", "Workspace not found.");
  }

  const apiKeys = await listWorkspaceApiKeys({
    userId: session.user.id,
    workspaceId: workspace.id
  });

  if (!apiKeys) {
    return apiError(403, "forbidden", "You do not have permission to read workspace API keys.");
  }

  return apiSuccess({
    apiKeys: apiKeys.map(serializeApiKey)
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before managing workspace API keys.");
  }

  const parsed = apiKeyCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(400, "validation_error", "Provide a descriptive API key name.");
  }

  const { slug } = await params;
  const workspace = await getWorkspaceForUser({
    slug,
    userId: session.user.id
  });

  if (!workspace) {
    return apiError(404, "not_found", "Workspace not found.");
  }

  const result = await createWorkspaceApiKey({
    name: parsed.data.name,
    userId: session.user.id,
    workspaceId: workspace.id
  });

  if (!result) {
    return apiError(403, "forbidden", "Only workspace owners and admins can create API keys.");
  }

  return apiSuccess(
    {
      apiKey: serializeApiKey(result.apiKey),
      rawKey: result.rawKey
    },
    {
      detail: "API key created.",
      status: 201
    }
  );
}
