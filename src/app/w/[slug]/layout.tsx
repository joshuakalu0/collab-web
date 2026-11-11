import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/components/sign-out-button";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { requireViewerSession } from "@/lib/session";
import { getWorkspaceForUser, listWorkspacesForUser } from "@booster/database";

export default async function WorkspaceLayout({
  children,
  params
}: Readonly<{
  children: ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const session = await requireViewerSession();
  const { slug } = await params;
  const [workspace, workspaces] = await Promise.all([
    getWorkspaceForUser({
      slug,
      userId: session.user.id
    }),
    listWorkspacesForUser(session.user.id)
  ]);

  if (!workspace) {
    notFound();
  }

  return (
    <main className="workspace-shell">
      <section className="workspace-header-card">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>{workspace.name}</h1>
            <p>
              Team-first collaboration with shared routing, version history, workspace-bound permissions,
              and a separate realtime service.
            </p>
          </div>
          <div className="workspace-header-actions">
            <Link className="primary-button link-button" href={`/w/${workspace.slug}/docs/new`}>
              New document
            </Link>
            <SignOutButton />
          </div>
        </div>
        <WorkspaceSwitcher activeSlug={workspace.slug} workspaces={workspaces} />
        <nav className="workspace-nav">
          <Link className="workspace-nav-link" href={`/w/${workspace.slug}`}>
            Overview
          </Link>
          <Link className="workspace-nav-link" href={`/w/${workspace.slug}/settings/team`}>
            Team
          </Link>
          <Link className="workspace-nav-link" href={`/w/${workspace.slug}/settings/api`}>
            API keys
          </Link>
          <Link className="workspace-nav-link" href="/docs/api">
            API docs
          </Link>
        </nav>
      </section>
      {children}
    </main>
  );
}
