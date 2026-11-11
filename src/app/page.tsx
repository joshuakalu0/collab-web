import Link from "next/link";
import { redirect } from "next/navigation";

import { getViewerSession } from "@/lib/session";
import { getDefaultWorkspaceForUser } from "@booster/database";

export default async function HomePage() {
  const session = await getViewerSession();

  if (!session?.user?.id) {
    return (
      <main className="marketing-shell">
        <section className="marketing-hero">
          <div className="marketing-copy">
            <p className="eyebrow">Project 3</p>
            <h1>Realtime collaboration with rooms, presence, and autosave that behave like a real product.</h1>
            <p>
              Authenticated users get shared document workspaces, live cursors, Redis-backed presence, and a
              separate socket service that scales independently from the web app.
            </p>
            <div className="hero-actions">
              <Link className="primary-button link-button" href="/sign-up">
                Create an account
              </Link>
              <Link className="ghost-button link-button" href="/sign-in">
                Sign in
              </Link>
            </div>
          </div>
          <div className="marketing-panel">
            <div className="marketing-stat">
              <span>Phase scope</span>
              <strong>1-5 implemented</strong>
            </div>
            <div className="marketing-stat">
              <span>Realtime model</span>
              <strong>Last-write-wins + presence</strong>
            </div>
            <div className="marketing-stat">
              <span>Access model</span>
              <strong>Workspace roles + doc access</strong>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const workspace = await getDefaultWorkspaceForUser(session.user.id);

  if (!workspace) {
    return (
      <main className="dashboard-shell">
        <section className="empty-card">
          <p className="eyebrow">Workspace required</p>
          <h1>We could not find a workspace for this account.</h1>
          <p>Sign out and back in once to let the bootstrap flow recreate your personal workspace.</p>
        </section>
      </main>
    );
  }

  redirect(`/w/${workspace.slug}`);
}
