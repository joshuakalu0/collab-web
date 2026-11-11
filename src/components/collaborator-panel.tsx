"use client";

import { startTransition, useMemo, useState, type FormEvent } from "react";

import type { CollaboratorDescriptor, DocumentAccess, WorkspaceRole } from "@booster/collab-contracts";

type WorkspaceShareMember = {
  currentAccess: DocumentAccess | null;
  email: string;
  id: string;
  image: string | null;
  name: string | null;
  role: WorkspaceRole;
};

type CollaboratorPanelProps = {
  canManage: boolean;
  documentId: string;
  initialCollaborators: CollaboratorDescriptor[];
  ownerEmail: string;
  workspaceMembers: WorkspaceShareMember[];
  workspaceName: string;
};

type MutationMessage = {
  tone: "error" | "success";
  value: string;
} | null;

export function CollaboratorPanel({
  canManage,
  documentId,
  initialCollaborators,
  ownerEmail,
  workspaceMembers,
  workspaceName
}: CollaboratorPanelProps) {
  const [access, setAccess] = useState<DocumentAccess>("EDIT");
  const [collaboratorUserId, setCollaboratorUserId] = useState(workspaceMembers.find((member) => member.currentAccess === null)?.id ?? "");
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [members, setMembers] = useState(workspaceMembers);
  const [message, setMessage] = useState<MutationMessage>(null);
  const [pending, setPending] = useState(false);

  const shareCandidates = useMemo(
    () => members.filter((member) => member.currentAccess === null),
    [members]
  );

  async function readEnvelope(response: Response) {
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.detail ?? "The request could not be completed.");
    }

    return payload.data;
  }

  function mutate(task: () => Promise<void>) {
    startTransition(() => {
      setPending(true);
      setMessage(null);
      void task()
        .catch((error: unknown) => {
          setMessage({
            tone: "error",
            value: error instanceof Error ? error.message : "The request failed."
          });
        })
        .finally(() => {
          setPending(false);
        });
    });
  }

  function handleGrantAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    mutate(async () => {
      const response = await fetch(`/api/documents/${documentId}/collaborators`, {
        body: JSON.stringify({
          access,
          userId: collaboratorUserId
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });

      const data = await readEnvelope(response);
      setCollaborators((current) => {
        const withoutExisting = current.filter((item) => item.id !== data.collaborator.id);
        return [...withoutExisting, data.collaborator].sort((left, right) => left.email.localeCompare(right.email));
      });
      setMembers((current) =>
        current.map((member) =>
          member.id === data.collaborator.id ? { ...member, currentAccess: data.collaborator.access } : member
        )
      );
      const nextCandidate = shareCandidates.find((member) => member.id !== data.collaborator.id);
      setCollaboratorUserId(nextCandidate?.id ?? "");
      setMessage({
        tone: "success",
        value: `Document access saved for ${data.collaborator.email}.`
      });
    });
  }

  function handleAccessChange(userId: string, nextAccess: DocumentAccess) {
    mutate(async () => {
      const response = await fetch(`/api/documents/${documentId}/collaborators/${userId}`, {
        body: JSON.stringify({
          access: nextAccess
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "PATCH"
      });

      await readEnvelope(response);
      setCollaborators((current) =>
        current.map((item) => (item.id === userId ? { ...item, access: nextAccess } : item))
      );
      setMembers((current) =>
        current.map((member) => (member.id === userId ? { ...member, currentAccess: nextAccess } : member))
      );
      setMessage({
        tone: "success",
        value: "Collaborator access updated."
      });
    });
  }

  function handleRemove(userId: string) {
    mutate(async () => {
      const response = await fetch(`/api/documents/${documentId}/collaborators/${userId}`, {
        method: "DELETE"
      });

      await readEnvelope(response);
      setCollaborators((current) => current.filter((item) => item.id !== userId));
      setMembers((current) =>
        current.map((member) => (member.id === userId ? { ...member, currentAccess: null } : member))
      );
      setMessage({
        tone: "success",
        value: "Collaborator removed from the document."
      });
    });
  }

  return (
    <section className="sidebar-card">
      <div className="sidebar-card-copy">
        <p className="eyebrow">Sharing</p>
        <h2>Workspace-bound access</h2>
        <p>
          Only members of <strong>{workspaceName}</strong> can be granted document access. Owners still control
          who receives view or edit rights.
        </p>
      </div>
      <div className="owner-banner">
        <span className="pill pill-amber">Owner</span>
        <span>{ownerEmail}</span>
      </div>
      {canManage ? (
        shareCandidates.length ? (
          <form className="invite-form" onSubmit={handleGrantAccess}>
            <label className="field compact-field">
              <span>Workspace member</span>
              <select onChange={(event) => setCollaboratorUserId(event.target.value)} value={collaboratorUserId}>
                {shareCandidates.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name ?? member.email} · {member.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span>Access</span>
              <select onChange={(event) => setAccess(event.target.value as DocumentAccess)} value={access}>
                <option value="EDIT">Edit</option>
                <option value="VIEW">View</option>
              </select>
            </label>
            <button className="secondary-button" disabled={pending || !collaboratorUserId} type="submit">
              {pending ? "Saving..." : "Grant access"}
            </button>
          </form>
        ) : (
          <p className="helper-copy">Everyone in this workspace who can be shared already has document access.</p>
        )
      ) : (
        <p className="helper-copy">You can see the collaborator roster, but only the document owner can change it.</p>
      )}
      {message ? (
        <p className={message.tone === "error" ? "form-error" : "form-success"}>{message.value}</p>
      ) : null}
      <div className="collaborator-list">
        {collaborators.length ? (
          collaborators.map((collaborator) => (
            <div className="collaborator-row" key={collaborator.id}>
              <div>
                <p className="collaborator-name">{collaborator.name ?? collaborator.email}</p>
                <p className="collaborator-email">
                  {collaborator.email} · {collaborator.workspaceRole}
                </p>
              </div>
              {canManage ? (
                <div className="collaborator-actions">
                  <select
                    disabled={pending}
                    onChange={(event) =>
                      handleAccessChange(collaborator.id, event.target.value as DocumentAccess)
                    }
                    value={collaborator.access}
                  >
                    <option value="EDIT">Edit</option>
                    <option value="VIEW">View</option>
                  </select>
                  <button className="text-button" disabled={pending} onClick={() => handleRemove(collaborator.id)} type="button">
                    Remove
                  </button>
                </div>
              ) : (
                <span className={`pill ${collaborator.access === "EDIT" ? "pill-amber" : "pill-slate"}`}>
                  {collaborator.access}
                </span>
              )}
            </div>
          ))
        ) : (
          <p className="helper-copy">No collaborators yet. Share this document with a workspace member to start collaborating.</p>
        )}
      </div>
    </section>
  );
}
