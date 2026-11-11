import { apiError, apiSuccess } from "@/lib/http";
import { authenticateRequestActor } from "@/lib/api-auth";
import { enforcePublicApiRateLimit, handleOptions } from "@/lib/public-api";
import { getPrismaClient, listWorkspacesForUser } from "@booster/database";
import { workspaceSummarySchema } from "@booster/collab-contracts";

export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return handleOptions(request);
}

export async function GET(request: Request) {
  const rateLimit = await enforcePublicApiRateLimit(request, {
    fallbackSubject: "public-workspaces",
    limit: 120,
    scope: "api-v1-workspaces",
    windowSeconds: 60
  });

  if (rateLimit.error) {
    return rateLimit.error;
  }

  const actor = await authenticateRequestActor(request);

  if (!actor) {
    return apiError(401, "unauthorized", "Authenticate with a session or API key before using the public API.", {
      headers: rateLimit.headers
    });
  }

  if (actor.kind === "api-key") {
    const workspace = await getPrismaClient().workspace.findUnique({
      include: {
        _count: {
          select: {
            documents: true,
            memberships: true
          }
        }
      },
      where: {
        id: actor.workspaceId
      }
    });

    if (!workspace) {
      return apiError(404, "not_found", "Workspace not found.", {
        headers: rateLimit.headers
      });
    }

    return apiSuccess(
      {
        workspaces: [
          workspaceSummarySchema.parse({
            documentCount: workspace._count.documents,
            id: workspace.id,
            isPersonal: workspace.isPersonal,
            memberCount: workspace._count.memberships,
            name: workspace.name,
            role: "ADMIN",
            slug: workspace.slug
          })
        ]
      },
      {
        headers: rateLimit.headers
      }
    );
  }

  const workspaces = await listWorkspacesForUser(actor.id);

  return apiSuccess(
    {
      workspaces: workspaces.map((workspace) => workspaceSummarySchema.parse(workspace))
    },
    {
      headers: rateLimit.headers
    }
  );
}
