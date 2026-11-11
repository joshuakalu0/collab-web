import { apiError, apiSuccess } from "@/lib/http";
import { getViewerSession } from "@/lib/session";
import { apiKeySummarySchema } from "@booster/collab-contracts";
import { getWorkspaceForUser, revokeWorkspaceApiKey } from "@booster/database";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ keyId: string; slug: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before managing workspace API keys.");
  }

  const { keyId, slug } = await params;
  const workspace = await getWorkspaceForUser({
    slug,
    userId: session.user.id
  });

  if (!workspace) {
    return apiError(404, "not_found", "Workspace not found.");
  }

  const apiKey = await revokeWorkspaceApiKey({
    keyId,
    userId: session.user.id,
    workspaceId: workspace.id
  });

  if (!apiKey) {
    return apiError(403, "forbidden", "Only workspace owners and admins can revoke API keys.");
  }

  return apiSuccess({
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
  });
}
