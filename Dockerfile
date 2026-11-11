FROM node:22-bookworm-slim AS base

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml .npmrc turbo.json tsconfig.base.json eslint.config.mjs ./
COPY apps/collab-web/package.json apps/collab-web/package.json
COPY packages/collab-contracts/package.json packages/collab-contracts/package.json
COPY packages/database/package.json packages/database/package.json
COPY services/collab-socket/package.json services/collab-socket/package.json

RUN corepack enable && pnpm install --frozen-lockfile=false

COPY apps/collab-web apps/collab-web
COPY packages packages

RUN pnpm --filter @booster/database db:generate
RUN pnpm --filter @booster/collab-web build

EXPOSE 3000

CMD ["pnpm", "--filter", "@booster/collab-web", "dev"]
