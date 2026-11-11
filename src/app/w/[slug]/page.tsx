import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentCard } from "@/components/document-card";
import { serializeDocumentSummary } from "@/lib/serialize";
import { requireViewerSession } from "@/lib/session";
import { getWorkspaceForUser, listWorkspaceDocumentsForUser } from "@booster/database";

export default async function WorkspaceDashboardPage({
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

  const documents = ((await listWorkspaceDocumentsForUser({
    userId: session.user.id,
    workspaceId: workspace.id
  })) ?? []).map(serializeDocumentSummary);

  return (
    <section className="workspace-section">
      <div className="workspace-section-copy">
        <p className="eyebrow">Dashboard</p>
        <h2>{workspace.isPersonal ? "Personal workspace" : "Team workspace"}</h2>
        <p>
          Every document here belongs to this workspace. Sharing is limited to workspace members, while
          document-level access still controls who can view or edit each room.
        </p>
      </div>
      <div className="workspace-metrics">
        <div className="workspace-metric-card">
          <span>Role</span>
          <strong>{workspace.role}</strong>
        </div>
        <div className="workspace-metric-card">
          <span>Members</span>
          <strong>{workspace.memberCount}</strong>
        </div>
        <div className="workspace-metric-card">
          <span>Documents</span>
          <strong>{workspace.documentCount}</strong>
        </div>
      </div>
      <section className="document-grid">
        {documents.length ? (
          documents.map((document) => <DocumentCard document={document} key={document.id} />)
        ) : (
          <div className="empty-card">
            <p className="eyebrow">No documents yet</p>
            <h2>This workspace is still empty.</h2>
            <p>Create a document, then share it with workspace members using view or edit access.</p>
            <Link className="primary-button link-button" href={`/w/${workspace.slug}/docs/new`}>
              Create the first document
            </Link>
          </div>
        )}
      </section>
    </section>
  );
}
