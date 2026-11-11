import { notFound } from "next/navigation";

import { ApiKeysPanel } from "@/components/api-keys-panel";
import { requireViewerSession } from "@/lib/session";
import { getWorkspaceForUser, listWorkspaceApiKeys } from "@booster/database";
import { apiKeySummarySchema } from "@booster/collab-contracts";

export default async function WorkspaceApiSettingsPage({
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

  const apiKeys = await listWorkspaceApiKeys({
    userId: session.user.id,
    workspaceId: workspace.id
  });

  return (
    <section className="workspace-settings-grid">
      <ApiKeysPanel
        canManage={workspace.role === "OWNER" || workspace.role === "ADMIN"}
        initialKeys={(apiKeys ?? []).map((apiKey) =>
          apiKeySummarySchema.parse({
            createdAt: apiKey.createdAt.toISOString(),
            createdBy: {
              email: apiKey.createdBy.email,
              id: apiKey.createdBy.id,
              image: apiKey.createdBy.image,
              name: apiKey.createdBy.name
            },
            id: apiKey.id,
            keyPrefix: apiKey.keyPrefix,
            lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
            name: apiKey.name,
            revokedAt: apiKey.revokedAt?.toISOString() ?? null,
            workspaceId: apiKey.workspaceId
          })
        )}
        workspaceSlug={workspace.slug}
      />
      <aside className="sidebar-card">
        <div className="sidebar-card-copy">
          <p className="eyebrow">Usage</p>
          <h2>Public API surface</h2>
          <p>
            Use workspace API keys for backend integrations, cron jobs, and external sync tools. Browser users can
            still use the same `/api/v1` routes with their session cookies.
          </p>
        </div>
        <ul className="feature-list">
          <li>`GET /api/v1/workspaces`</li>
          <li>`GET|POST /api/v1/workspaces/:workspaceId/documents`</li>
          <li>`GET|PATCH|DELETE /api/v1/documents/:id`</li>
          <li>`GET /api/v1/documents/:id/versions`</li>
        </ul>
      </aside>
    </section>
  );
}
