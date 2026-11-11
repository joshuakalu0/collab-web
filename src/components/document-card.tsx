import Link from "next/link";

import type { DocumentSummary } from "@booster/collab-contracts";

type DocumentCardProps = {
  document: DocumentSummary;
};

export function DocumentCard({ document }: DocumentCardProps) {
  return (
    <Link className="document-card" href={`/docs/${document.id}`}>
      <div className="document-card-top">
        <div>
          <p className="document-card-title">{document.title}</p>
          <p className="document-card-meta">
            {document.isOwner ? "Owner" : document.access === "EDIT" ? "Editor" : "Viewer"} · {document.workspaceName}
          </p>
        </div>
        <span className={`pill ${document.access === "EDIT" ? "pill-amber" : "pill-slate"}`}>
          {document.access}
        </span>
      </div>
      <p className="document-card-preview">
        {document.preview || "This document is still empty. Open it to start collaborating."}
      </p>
      <div className="document-card-footer">
        <span>{document.shared ? "Shared room" : "Owned room"} · {document.collaboratorCount} collaborators</span>
        <span>
          {document.lastSavedAt
            ? `Saved ${new Date(document.lastSavedAt).toLocaleString()}`
            : `Updated ${new Date(document.updatedAt).toLocaleString()}`}
        </span>
      </div>
    </Link>
  );
}
