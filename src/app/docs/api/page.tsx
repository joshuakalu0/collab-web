export default function PublicApiDocsPage() {
  return (
    <main className="dashboard-shell">
      <section className="workspace-header-card">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">API reference</p>
            <h1>Collab Workspace public API</h1>
            <p>
              The public API supports session-authenticated browser requests and workspace-scoped bearer API keys
              for external integrations.
            </p>
          </div>
        </div>
      </section>
      <section className="workspace-settings-grid">
        <article className="sidebar-card">
          <div className="sidebar-card-copy">
            <p className="eyebrow">Auth</p>
            <h2>Authentication modes</h2>
            <p>Use either your existing web session or a workspace API key.</p>
          </div>
          <pre className="docs-code-block">{`Authorization: Bearer boost_live_xxxxxxxxx`}</pre>
          <pre className="docs-code-block">{`fetch("/api/v1/workspaces", { credentials: "include" })`}</pre>
        </article>
        <article className="sidebar-card">
          <div className="sidebar-card-copy">
            <p className="eyebrow">Endpoints</p>
            <h2>Supported routes</h2>
          </div>
          <ul className="feature-list">
            <li>`GET /api/v1/workspaces`</li>
            <li>`GET|POST /api/v1/workspaces/:workspaceId/documents`</li>
            <li>`GET|PATCH|DELETE /api/v1/documents/:id`</li>
            <li>`GET /api/v1/documents/:id/versions`</li>
            <li>`POST /api/v1/documents/:id/versions/:versionId/restore`</li>
            <li>`GET|POST /api/v1/workspaces/:workspaceId/api-keys`</li>
            <li>`DELETE /api/v1/workspaces/:workspaceId/api-keys/:keyId`</li>
          </ul>
        </article>
      </section>
      <section className="workspace-settings-grid">
        <article className="sidebar-card">
          <div className="sidebar-card-copy">
            <p className="eyebrow">JavaScript</p>
            <h2>Browser or Node example</h2>
          </div>
          <pre className="docs-code-block">{`const response = await fetch("/api/v1/workspaces", {
  headers: { Authorization: "Bearer boost_live_xxxxx" }
});

const payload = await response.json();
console.log(payload.data.workspaces);`}</pre>
        </article>
        <article className="sidebar-card">
          <div className="sidebar-card-copy">
            <p className="eyebrow">Python</p>
            <h2>Server-side example</h2>
          </div>
          <pre className="docs-code-block">{`import requests

response = requests.get(
    "https://your-app.example.com/api/v1/workspaces",
    headers={"Authorization": "Bearer boost_live_xxxxx"},
    timeout=10,
)
print(response.json()["data"]["workspaces"])`}</pre>
        </article>
      </section>
    </main>
  );
}
