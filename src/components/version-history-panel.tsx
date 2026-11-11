"use client";

import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

import type { DocumentVersion } from "@booster/collab-contracts";

type VersionHistoryPanelProps = {
  documentId: string;
  initialVersions: DocumentVersion[];
  isOwner: boolean;
};

type MutationMessage = {
  tone: "error" | "success";
  value: string;
} | null;

export function VersionHistoryPanel({
  documentId,
  initialVersions,
  isOwner
}: VersionHistoryPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<MutationMessage>(null);
  const [pending, setPending] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersions[0]?.id ?? null);

  const selectedVersion = useMemo(
    () => initialVersions.find((version) => version.id === selectedVersionId) ?? initialVersions[0] ?? null,
    [initialVersions, selectedVersionId]
  );

  function handleRestore(versionId: string) {
    startTransition(() => {
      setPending(true);
      setMessage(null);
      void fetch(`/api/documents/${documentId}/versions/${versionId}/restore`, {
        method: "POST"
      })
        .then(async (response) => {
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload.detail ?? "The restore request failed.");
          }

          setMessage({
            tone: "success",
            value: "The selected version was restored and broadcast to connected collaborators."
          });
          router.refresh();
        })
        .catch((error: unknown) => {
          setMessage({
            tone: "error",
            value: error instanceof Error ? error.message : "The restore request failed."
          });
        })
        .finally(() => {
          setPending(false);
        });
    });
  }

  return (
    <section className="sidebar-card">
      <div className="sidebar-card-copy">
        <p className="eyebrow">History</p>
        <h2>Version timeline</h2>
        <p>Autosave snapshots are kept per document so teams can inspect changes and owners can restore them.</p>
      </div>
      {message ? (
        <p className={message.tone === "error" ? "form-error" : "form-success"}>{message.value}</p>
      ) : null}
      <div className="version-list">
        {initialVersions.length ? (
          initialVersions.map((version) => (
            <button
              className={`version-item ${selectedVersion?.id === version.id ? "version-item-active" : ""}`}
              key={version.id}
              onClick={() => setSelectedVersionId(version.id)}
              type="button"
            >
              <strong>Revision {version.revision}</strong>
              <span>{new Date(version.savedAt).toLocaleString()}</span>
            </button>
          ))
        ) : (
          <p className="helper-copy">No saved versions yet. The first autosave will create the initial history.</p>
        )}
      </div>
      {selectedVersion ? (
        <div className="version-preview">
          <div className="owner-banner">
            <span className="pill pill-slate">Preview</span>
            <span>{selectedVersion.savedBy?.name ?? selectedVersion.savedBy?.email ?? "System save"}</span>
          </div>
          <pre>{selectedVersion.content || "This revision is empty."}</pre>
          {isOwner ? (
            <button className="secondary-button" disabled={pending} onClick={() => handleRestore(selectedVersion.id)} type="button">
              {pending ? "Restoring..." : "Restore this version"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
