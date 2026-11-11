import { redirect } from "next/navigation";

import { requireViewerSession } from "@/lib/session";
import { getDefaultWorkspaceForUser } from "@booster/database";

export default async function NewDocumentRedirectPage() {
  const session = await requireViewerSession();
  const workspace = await getDefaultWorkspaceForUser(session.user.id);

  if (!workspace) {
    redirect("/");
  }

  redirect(`/w/${workspace.slug}/docs/new`);
}
