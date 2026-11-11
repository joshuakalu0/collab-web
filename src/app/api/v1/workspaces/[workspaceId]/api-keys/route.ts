import { apiError, apiSuccess } from "@/lib/http";
import { requireWorkspaceActor } from "@/lib/api-auth";
import { enforcePublicApiRateLimit, handleOptions } from "@/lib/public-api";
import { apiKeyCreateSchema, apiKeySummarySchema } from "@booster/collab-contracts";
import { createWorkspaceApiKey, listWorkspaceApiKeys } from "@booster/database";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return handleOptions(request);
}

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
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const rateLimit = await enforcePublicApiRateLimit(request, {
    fallbackSubject: "workspace-api-keys-read",
    limit: 60,
    scope: "api-v1-workspace-api-keys-read",
    windowSeconds: 60
  });

  if (rateLimit.error) {
    return rateLimit.error;
  }

  const { workspaceId } = await params;
  const authResult = await requireWorkspaceActor(request, workspaceId);

  if (!authResult || !("actor" in authResult) || authResult.actor.kind !== "session") {
    return apiError(403, "forbidden", "Only session-authenticated workspace managers can view API keys.", {
      headers: rateLimit.headers
    });
  }

  const apiKeys = await listWorkspaceApiKeys({
    userId: authResult.actor.id,
    workspaceId
  });

  if (!apiKeys) {
    return apiError(403, "forbidden", "Only workspace owners and admins can view API keys.", {
      headers: rateLimit.headers
    });
  }

  return apiSuccess(
    {
      apiKeys: apiKeys.map(serializeApiKey)
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
    fallbackSubject: "workspace-api-keys-write",
    limit: 20,
    scope: "api-v1-workspace-api-keys-write",
    windowSeconds: 60
  });

  if (rateLimit.error) {
    return rateLimit.error;
  }

  const { workspaceId } = await params;
  const authResult = await requireWorkspaceActor(request, workspaceId);

  if (!authResult || !("actor" in authResult) || authResult.actor.kind !== "session") {
    return apiError(403, "forbidden", "Only session-authenticated workspace managers can create API keys.", {
      headers: rateLimit.headers
    });
  }

  const parsed = apiKeyCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(400, "validation_error", "Provide a descriptive API key name.", {
      headers: rateLimit.headers
    });
  }

  const result = await createWorkspaceApiKey({
    name: parsed.data.name,
    userId: authResult.actor.id,
    workspaceId
  });

  if (!result) {
    return apiError(403, "forbidden", "Only workspace owners and admins can create API keys.", {
      headers: rateLimit.headers
    });
  }

  return apiSuccess(
    {
      apiKey: serializeApiKey(result.apiKey),
      rawKey: result.rawKey
    },
    {
      headers: rateLimit.headers,
      status: 201
    }
  );
}
