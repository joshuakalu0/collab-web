import Link from "next/link";
import { notFound } from "next/navigation";

import { CollaboratorPanel } from "@/components/collaborator-panel";
import { CollabEditor } from "@/components/editor/collab-editor";
import { VersionHistoryPanel } from "@/components/version-history-panel";
import { serializeDocumentDetail } from "@/lib/serialize";
import { requireViewerSession } from "@/lib/session";
import { getAccessibleDocument, getDocumentSharingState } from "@booster/database";

export default async function DocumentPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireViewerSession();
  const { id } = await params;
  const document = await getAccessibleDocument({
    documentId: id,
    userId: session.user.id
  });
  const sharing = await getDocumentSharingState({
    documentId: id,
    userId: session.user.id
  });

  if (!document || !sharing) {
    notFound();
  }

  const viewModel = serializeDocumentDetail(document);

  return (
    <main className="document-shell">
      <header className="document-header">
        <div>
          <p className="eyebrow">Document room</p>
          <h1>{viewModel.title}</h1>
          <p>
            {viewModel.isOwner ? "You own this room." : "You are collaborating in this room."} The editor uses
            full-content realtime updates with delayed persistence to PostgreSQL, plus workspace-bound sharing and
            version restore support.
          </p>
        </div>
        <div className="document-header-actions">
          <span className={`pill ${viewModel.access === "EDIT" ? "pill-amber" : "pill-slate"}`}>
            {viewModel.access}
          </span>
          <span className="pill pill-slate">{viewModel.workspaceRole}</span>
          <Link className="ghost-button link-button" href={`/w/${viewModel.workspaceSlug}`}>
            Back to dashboard
          </Link>
        </div>
      </header>
      <section className="document-layout">
        <CollabEditor
          access={viewModel.access}
          currentUser={{
            email: session.user.email ?? "",
            id: session.user.id,
            image: session.user.image ?? null,
            name: session.user.name ?? null
          }}
          documentId={viewModel.id}
          initialCollaborators={viewModel.collaborators}
          initialContent={viewModel.content}
          initialRevision={viewModel.revision}
        />
        <CollaboratorPanel
          canManage={sharing.canManage}
          documentId={viewModel.id}
          initialCollaborators={viewModel.collaborators}
          ownerEmail={viewModel.isOwner ? session.user.email ?? "" : "Owner account"}
          workspaceMembers={sharing.members}
          workspaceName={viewModel.workspaceName}
        />
      </section>
      <section className="document-detail-grid">
        <VersionHistoryPanel
          documentId={viewModel.id}
          initialVersions={viewModel.versions}
          isOwner={viewModel.isOwner}
        />
      </section>
    </main>
  );
}
