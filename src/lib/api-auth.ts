import { auth } from "@/auth";
import {
  authenticateWorkspaceApiKey,
  getDocumentAccessContext,
  getPrismaClient,
  getWorkspaceMembershipForUser,
  touchWorkspaceApiKeyUsage
} from "@booster/database";

type SessionActor = {
  email: string | null;
  id: string;
  image: string | null;
  kind: "session";
  name: string | null;
};

type ApiKeyActor = {
  apiKeyId: string;
  createdById: string;
  kind: "api-key";
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
};

export type ApiActor = ApiKeyActor | SessionActor;

export async function authenticateRequestActor(request: Request): Promise<ApiActor | null> {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const apiKey = await authenticateWorkspaceApiKey(authorization.slice("Bearer ".length).trim());

    if (!apiKey) {
      return null;
    }

    await touchWorkspaceApiKeyUsage(apiKey.apiKeyId);

    return {
      apiKeyId: apiKey.apiKeyId,
      createdById: apiKey.createdById,
      kind: "api-key",
      workspaceId: apiKey.workspaceId,
      workspaceName: apiKey.workspaceName,
      workspaceSlug: apiKey.workspaceSlug
    };
  }

  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    email: session.user.email ?? null,
    id: session.user.id,
    image: session.user.image ?? null,
    kind: "session",
    name: session.user.name ?? null
  };
}

export async function requireWorkspaceActor(request: Request, workspaceId: string) {
  const actor = await authenticateRequestActor(request);

  if (!actor) {
    return null;
  }

  if (actor.kind === "api-key") {
    return actor.workspaceId === workspaceId ? actor : null;
  }

  const membership = await getWorkspaceMembershipForUser({
    userId: actor.id,
    workspaceId
  });

  if (!membership) {
    return null;
  }

  return {
    actor,
    membership
  };
}

export async function requireDocumentActor(request: Request, documentId: string) {
  const actor = await authenticateRequestActor(request);

  if (!actor) {
    return null;
  }

  if (actor.kind === "api-key") {
    const document = await getPrismaClient().document.findUnique({
      select: {
        workspaceId: true
      },
      where: {
        id: documentId
      }
    });

    if (!document || document.workspaceId !== actor.workspaceId) {
      return null;
    }

    return {
      access: "EDIT" as const,
      actor,
      isOwner: false,
      workspaceId: actor.workspaceId
    };
  }

  const context = await getDocumentAccessContext({
    documentId,
    userId: actor.id
  });

  if (!context) {
    return null;
  }

  return {
    ...context,
    actor
  };
}
