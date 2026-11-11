import { apiError, apiSuccess } from "@/lib/http";
import { requireWorkspaceActor } from "@/lib/api-auth";
import { enforcePublicApiRateLimit, handleOptions } from "@/lib/public-api";
import { apiKeySummarySchema } from "@booster/collab-contracts";
import { revokeWorkspaceApiKey } from "@booster/database";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return handleOptions(request);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ keyId: string; workspaceId: string }> }
) {
  const rateLimit = await enforcePublicApiRateLimit(request, {
    fallbackSubject: "workspace-api-keys-delete",
    limit: 20,
    scope: "api-v1-workspace-api-keys-delete",
    windowSeconds: 60
  });

  if (rateLimit.error) {
    return rateLimit.error;
  }

  const { keyId, workspaceId } = await params;
  const authResult = await requireWorkspaceActor(request, workspaceId);

  if (!authResult || !("actor" in authResult) || authResult.actor.kind !== "session") {
    return apiError(403, "forbidden", "Only session-authenticated workspace managers can revoke API keys.", {
      headers: rateLimit.headers
    });
  }

  const apiKey = await revokeWorkspaceApiKey({
    keyId,
    userId: authResult.actor.id,
    workspaceId
  });

  if (!apiKey) {
    return apiError(403, "forbidden", "Only workspace owners and admins can revoke API keys.", {
      headers: rateLimit.headers
    });
  }

  return apiSuccess(
    {
      apiKey: apiKeySummarySchema.parse({
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
      })
    },
    {
      headers: rateLimit.headers
    }
  );
}
