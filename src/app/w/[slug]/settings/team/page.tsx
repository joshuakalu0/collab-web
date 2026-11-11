import { notFound } from "next/navigation";

import { TeamSettingsPanel } from "@/components/team-settings-panel";
import { requireViewerSession } from "@/lib/session";
import { getWorkspaceForUser, listWorkspaceMembers } from "@booster/database";

export default async function WorkspaceTeamSettingsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireViewerSession();
  const { slug } = await params;
  const workspace = await getWorkspaceForUser({
    slug,
    userId: session.user.id
  });

  if (!workspace) {
    notFound();
  }

  const members = await listWorkspaceMembers({
    userId: session.user.id,
    workspaceId: workspace.id
  });

  if (!members) {
    notFound();
  }

  return (
    <section className="workspace-settings-grid">
      <TeamSettingsPanel initialMembers={members} viewerRole={workspace.role} workspaceSlug={workspace.slug} />
      <aside className="sidebar-card">
        <div className="sidebar-card-copy">
          <p className="eyebrow">Policy</p>
          <h2>Workspace rules</h2>
          <p>
            Owners can manage every non-owner member. Admins can manage members, but they cannot promote people
            to admin or change owner-level access.
          </p>
        </div>
        <div className="workspace-metrics">
          <div className="workspace-metric-card">
            <span>Your role</span>
            <strong>{workspace.role}</strong>
          </div>
          <div className="workspace-metric-card">
            <span>Members</span>
            <strong>{workspace.memberCount}</strong>
          </div>
        </div>
      </aside>
    </section>
  );
}
