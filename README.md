# Project 3: Collab Workspace

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Realtime collaborative editing product built for the portfolio brief. The web app lives here in `apps/collab-web`, the standalone Socket.IO service lives in `services/collab-socket`, and shared contracts/database code live in `packages/collab-contracts` and `packages/database`.

## What this build includes

- Workspace-first routing with `/w/[slug]` dashboards and settings
- Stable document editor URLs at `/docs/[id]`
- Auth.js credentials and GitHub sign-in
- Workspace membership roles: `OWNER`, `ADMIN`, `MEMBER`
- Document sharing permissions: `VIEW`, `EDIT`
- Realtime editor with presence, remote cursors, reconnect states, and autosave indicators
- Redis-backed presence, cached document state, and distributed autosave coordination
- Version history with owner-only restore
- Public `/api/v1` routes for workspaces, documents, versions, and workspace API keys
- Workspace-scoped API keys with one-time reveal and `lastUsedAt` tracking

## Architecture

```text
Browser
  -> Next.js app (apps/collab-web)
      -> Auth.js session auth
      -> REST + public API routes
      -> short-lived socket token minting
      -> Prisma -> PostgreSQL
      -> Redis rate limiting
      -> internal snapshot sync -> Socket service

Socket.IO clients
  -> standalone realtime service (services/collab-socket)
      -> validates socket JWT
      -> Redis adapter for multi-instance rooms
      -> Redis room presence + document cache
      -> delayed flush queue
      -> Prisma -> PostgreSQL persistence

Shared packages
  -> packages/collab-contracts
  -> packages/database
```

## Realtime contract

Client events:

- `room:join { documentId }`
- `room:leave { documentId }`
- `doc:change { documentId, content, baseRevision, selectionStart, selectionEnd }`
- `cursor:move { documentId, caretStart, caretEnd }`

Server events:

- `room:snapshot`
- `presence:update`
- `doc:updated`
- `doc:saved`
- `socket:error`

## Conflict strategy

This project intentionally keeps v1 editing semantics simple and honest:

- document storage is plaintext
- editor updates are full-content payloads
- realtime conflict handling is `last-write-wins`
- autosave persists the latest Redis-backed snapshot after a debounce window

That tradeoff is deliberate for a portfolio-ready v1. The code is structured so OT/CRDT could be layered in later without throwing away the workspace/auth/billing-quality product shell.

## Environment

Start from `config/env/.env.node.shared.example`.

Important variables:

- `DATABASE_URL`
- `REDIS_URL`
- `REDIS_PREFIX`
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `SOCKET_TOKEN_SECRET`
- `SOCKET_INTERNAL_SECRET`
- `API_ALLOWED_ORIGINS`

## Local development

1. Install dependencies: `pnpm.cmd install`
2. Generate Prisma client: `pnpm.cmd --filter @booster/database db:generate`
3. Run migrations: `pnpm.cmd --filter @booster/database db:migrate`
4. If upgrading older data, run: `pnpm.cmd --filter @booster/database db:backfill-workspaces`
5. Seed demo data: `pnpm.cmd --filter @booster/database db:seed`
6. Start the local stack:
   - app and service with Docker: `docker compose -f ops/collab/docker-compose.yml up --build`
   - or workspace dev mode: `pnpm.cmd collab:dev`

## Migration and backfill notes

The schema now includes:

- `Workspace`
- `WorkspaceMembership`
- `DocumentVersion`
- `ApiKey`
- `Document.workspaceId`

If you are migrating an older local database, backfill requirements are:

1. create a personal workspace per existing document owner
2. attach each document to its owner workspace
3. create owner workspace memberships
4. ensure every existing collaborator also has workspace membership

## Public API quick reference

- `GET /api/v1/workspaces`
- `GET|POST /api/v1/workspaces/:workspaceId/documents`
- `GET|PATCH|DELETE /api/v1/documents/:id`
- `GET /api/v1/documents/:id/versions`
- `POST /api/v1/documents/:id/versions/:versionId/restore`
- `GET|POST /api/v1/workspaces/:workspaceId/api-keys`
- `DELETE /api/v1/workspaces/:workspaceId/api-keys/:keyId`

Auth methods:

- browser session cookies for in-app clients
- `Authorization: Bearer <api-key>` for external clients

## Deployment shape

- Web app target: Vercel
- Realtime service target: Railway
- Shared Redis/PostgreSQL target: Railway or equivalent managed services

Deployment URL placeholders:

- Web: `https://your-collab-web.example.com`
- Socket: `https://your-collab-socket.example.com`
- API docs: `https://your-collab-web.example.com/docs/api`

## Demo recording checklist

- Sign up with credentials
- Show workspace redirect and workspace switcher
- Create a document inside a workspace
- Add a workspace member
- Share the document with `VIEW`, then upgrade to `EDIT`
- Open two browser sessions and show live content sync
- Show presence chips and remote cursor labels
- Pause editing and show autosave state transition
- Open version history and restore an older revision
- Create an API key and copy it once
- Call `/api/v1/workspaces` with the API key
