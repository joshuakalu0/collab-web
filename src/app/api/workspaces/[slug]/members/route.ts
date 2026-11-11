import { apiError, apiSuccess } from "@/lib/http";
import { getViewerSession } from "@/lib/session";
import { workspaceMemberCreateSchema } from "@booster/collab-contracts";
import { addWorkspaceMemberByEmail, getWorkspaceForUser, listWorkspaceMembers } from "@booster/database";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before reading workspace members.");
  }

  const { slug } = await params;
  const workspace = await getWorkspaceForUser({
    slug,
    userId: session.user.id
  });

  if (!workspace) {
    return apiError(404, "not_found", "Workspace not found.");
  }

  const members = await listWorkspaceMembers({
    userId: session.user.id,
    workspaceId: workspace.id
  });

  return apiSuccess({
    members: members ?? []
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before managing workspace members.");
  }

  const parsed = workspaceMemberCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return apiError(400, "validation_error", "Provide a valid email address and role.");
  }

  const { slug } = await params;
  const workspace = await getWorkspaceForUser({
    slug,
    userId: session.user.id
  });

  if (!workspace) {
    return apiError(404, "not_found", "Workspace not found.");
  }

  const result = await addWorkspaceMemberByEmail({
    actorUserId: session.user.id,
    email: parsed.data.email,
    role: parsed.data.role,
    workspaceId: workspace.id
  });

  if (!result) {
    return apiError(403, "forbidden", "You do not have permission to manage workspace members.");
  }

  if (result.reason === "user_not_found") {
    return apiError(404, "not_found", "That account does not exist yet.");
  }

  if (result.reason === "forbidden") {
    return apiError(403, "forbidden", "Your role cannot assign that workspace role.");
  }

  return apiSuccess(
    {
      member: result.result
    },
    {
      detail: "Workspace member saved.",
      status: 201
    }
  );
}
