"use client";

import { startTransition, useState, type FormEvent } from "react";

import type { WorkspaceMember, WorkspaceRole } from "@booster/collab-contracts";

type TeamSettingsPanelProps = {
  initialMembers: WorkspaceMember[];
  viewerRole: WorkspaceRole;
  workspaceSlug: string;
};

type MutationMessage = {
  tone: "error" | "success";
  value: string;
} | null;

export function TeamSettingsPanel({
  initialMembers,
  viewerRole,
  workspaceSlug
}: TeamSettingsPanelProps) {
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState(initialMembers);
  const [message, setMessage] = useState<MutationMessage>(null);
  const [pending, setPending] = useState(false);
  const [role, setRole] = useState<WorkspaceRole>("MEMBER");
  const canManage = viewerRole === "OWNER" || viewerRole === "ADMIN";

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

  function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    mutate(async () => {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/members`, {
        body: JSON.stringify({
          email,
          role
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });

      const data = await readEnvelope(response);
      setMembers((current) => {
        const withoutExisting = current.filter((member) => member.id !== data.member.id);
        return [...withoutExisting, data.member].sort((left, right) => left.email.localeCompare(right.email));
      });
      setEmail("");
      setRole("MEMBER");
      setMessage({
        tone: "success",
        value: `Saved workspace membership for ${data.member.email}.`
      });
    });
  }

  function handleRoleChange(userId: string, nextRole: WorkspaceRole) {
    mutate(async () => {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/members/${userId}`, {
        body: JSON.stringify({
          role: nextRole
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "PATCH"
      });

      const data = await readEnvelope(response);
      setMembers((current) =>
        current.map((member) => (member.id === userId ? { ...member, role: data.member.role } : member))
      );
      setMessage({
        tone: "success",
        value: "Workspace role updated."
      });
    });
  }

  function handleRemove(userId: string) {
    mutate(async () => {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/members/${userId}`, {
        method: "DELETE"
      });

      await readEnvelope(response);
      setMembers((current) => current.filter((member) => member.id !== userId));
      setMessage({
        tone: "success",
        value: "Workspace member removed."
      });
    });
  }

  return (
    <section className="sidebar-card">
      <div className="sidebar-card-copy">
        <p className="eyebrow">Team</p>
        <h2>Workspace members</h2>
        <p>
          Workspace membership is the outer permission boundary. Documents can only be shared with people who
          already belong to this workspace.
        </p>
      </div>
      {canManage ? (
        <form className="invite-form" onSubmit={handleInvite}>
          <label className="field compact-field">
            <span>Email</span>
            <input
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="field compact-field">
            <span>Role</span>
            <select onChange={(event) => setRole(event.target.value as WorkspaceRole)} value={role}>
              <option value="MEMBER">Member</option>
              {viewerRole === "OWNER" ? <option value="ADMIN">Admin</option> : null}
            </select>
          </label>
          <button className="secondary-button" disabled={pending} type="submit">
            {pending ? "Saving..." : "Add member"}
          </button>
        </form>
      ) : (
        <p className="helper-copy">Members can view the roster, but only owners and admins can manage it.</p>
      )}
      {message ? (
        <p className={message.tone === "error" ? "form-error" : "form-success"}>{message.value}</p>
      ) : null}
      <div className="collaborator-list">
        {members.map((member) => (
          <div className="collaborator-row" key={member.id}>
            <div>
              <p className="collaborator-name">{member.name ?? member.email}</p>
              <p className="collaborator-email">{member.email}</p>
            </div>
            {canManage && member.role !== "OWNER" ? (
              <div className="collaborator-actions">
                <select
                  disabled={pending}
                  onChange={(event) => handleRoleChange(member.id, event.target.value as WorkspaceRole)}
                  value={member.role}
                >
                  <option value="MEMBER">Member</option>
                  {viewerRole === "OWNER" ? <option value="ADMIN">Admin</option> : null}
                </select>
                <button className="text-button" disabled={pending} onClick={() => handleRemove(member.id)} type="button">
                  Remove
                </button>
              </div>
            ) : (
              <span className={`pill ${member.role === "OWNER" ? "pill-amber" : "pill-slate"}`}>{member.role}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
