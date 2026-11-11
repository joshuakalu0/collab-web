"use client";

import { startTransition, useState, type FormEvent } from "react";

import type { ApiKeySummary } from "@booster/collab-contracts";

type ApiKeysPanelProps = {
  canManage: boolean;
  initialKeys: ApiKeySummary[];
  workspaceSlug: string;
};

type MutationMessage = {
  tone: "error" | "success";
  value: string;
} | null;

export function ApiKeysPanel({
  canManage,
  initialKeys,
  workspaceSlug
}: ApiKeysPanelProps) {
  const [apiKeys, setApiKeys] = useState(initialKeys);
  const [message, setMessage] = useState<MutationMessage>(null);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

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

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    mutate(async () => {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/api-keys`, {
        body: JSON.stringify({
          name
        }),
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });

      const data = await readEnvelope(response);
      setApiKeys((current) => [data.apiKey, ...current]);
      setName("");
      setRevealedKey(data.rawKey);
      setMessage({
        tone: "success",
        value: "API key created. Copy the raw value now because it will not be shown again."
      });
    });
  }

  function handleRevoke(keyId: string) {
    mutate(async () => {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/api-keys/${keyId}`, {
        method: "DELETE"
      });

      const data = await readEnvelope(response);
      setApiKeys((current) =>
        current.map((apiKey) => (apiKey.id === keyId ? { ...apiKey, revokedAt: data.apiKey.revokedAt } : apiKey))
      );
      setMessage({
        tone: "success",
        value: "API key revoked."
      });
    });
  }

  return (
    <section className="sidebar-card">
      <div className="sidebar-card-copy">
        <p className="eyebrow">API keys</p>
        <h2>Workspace integrations</h2>
        <p>
          Keys are bound to a single workspace. External clients can use them with `Authorization: Bearer
          &lt;api-key&gt;` against `/api/v1`.
        </p>
      </div>
      {canManage ? (
        <form className="invite-form" onSubmit={handleCreate}>
          <label className="field compact-field">
            <span>Key name</span>
            <input
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="Production sync"
              required
              type="text"
              value={name}
            />
          </label>
          <button className="secondary-button" disabled={pending} type="submit">
            {pending ? "Creating..." : "Create API key"}
          </button>
        </form>
      ) : (
        <p className="helper-copy">Only workspace owners and admins can create or revoke API keys.</p>
      )}
      {message ? (
        <p className={message.tone === "error" ? "form-error" : "form-success"}>{message.value}</p>
      ) : null}
      {revealedKey ? (
        <div className="owner-banner">
          <span className="pill pill-amber">New key</span>
          <code className="inline-code">{revealedKey}</code>
        </div>
      ) : null}
      <div className="collaborator-list">
        {apiKeys.length ? (
          apiKeys.map((apiKey) => (
            <div className="collaborator-row" key={apiKey.id}>
              <div>
                <p className="collaborator-name">{apiKey.name}</p>
                <p className="collaborator-email">
                  {apiKey.keyPrefix} · created {new Date(apiKey.createdAt).toLocaleString()}
                </p>
              </div>
              {apiKey.revokedAt ? (
                <span className="pill pill-slate">Revoked</span>
              ) : canManage ? (
                <button className="text-button" disabled={pending} onClick={() => handleRevoke(apiKey.id)} type="button">
                  Revoke
                </button>
              ) : (
                <span className="pill pill-green">
                  {apiKey.lastUsedAt ? `Used ${new Date(apiKey.lastUsedAt).toLocaleDateString()}` : "Active"}
                </span>
              )}
            </div>
          ))
        ) : (
          <p className="helper-copy">No API keys yet.</p>
        )}
      </div>
    </section>
  );
}
