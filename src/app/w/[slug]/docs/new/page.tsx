import Link from "next/link";
import { notFound } from "next/navigation";

import { createWorkspaceDocumentAction } from "@/app/actions";
import { requireViewerSession } from "@/lib/session";
import { getWorkspaceForUser } from "@booster/database";

export default async function WorkspaceCreateDocumentPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireViewerSession();
  const { slug } = await params;
  const { error } = await searchParams;
  const workspace = await getWorkspaceForUser({
    slug,
    userId: session.user.id
  });

  if (!workspace) {
    notFound();
  }

  return (
    <section className="creation-card">
      <div className="creation-copy">
        <p className="eyebrow">New document</p>
        <h1>Create inside {workspace.name}</h1>
        <p>
          New documents inherit the workspace boundary immediately, so only members of this workspace can
          ever be granted view or edit access.
        </p>
      </div>
      <form action={createWorkspaceDocumentAction.bind(null, workspace.slug)} className="creation-form">
        <label className="field">
          <span>Document title</span>
          <input defaultValue="Untitled document" maxLength={120} name="title" required type="text" />
        </label>
        {error ? <p className="form-error">Choose a valid document title to continue.</p> : null}
        <div className="creation-actions">
          <button className="primary-button" type="submit">
            Create and open
          </button>
          <Link className="ghost-button link-button" href={`/w/${workspace.slug}`}>
            Back to workspace
          </Link>
        </div>
      </form>
    </section>
  );
}
