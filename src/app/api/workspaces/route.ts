import { apiError, apiSuccess } from "@/lib/http";
import { getViewerSession } from "@/lib/session";
import { listWorkspacesForUser } from "@booster/database";

export const runtime = "nodejs";

export async function GET() {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return apiError(401, "unauthorized", "Sign in before reading workspaces.");
  }

  const workspaces = await listWorkspacesForUser(session.user.id);

  return apiSuccess({
    workspaces
  });
}
