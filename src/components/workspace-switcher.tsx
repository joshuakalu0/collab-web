import Link from "next/link";

import type { WorkspaceSummary } from "@booster/collab-contracts";

type WorkspaceSwitcherProps = {
  activeSlug: string;
  workspaces: WorkspaceSummary[];
};

export function WorkspaceSwitcher({ activeSlug, workspaces }: WorkspaceSwitcherProps) {
  return (
    <div className="workspace-switcher">
      {workspaces.map((workspace) => (
        <Link
          className={`workspace-switcher-link ${workspace.slug === activeSlug ? "workspace-switcher-link-active" : ""}`}
          href={`/w/${workspace.slug}`}
          key={workspace.id}
        >
          <span>{workspace.name}</span>
          <span className="workspace-switcher-meta">
            {workspace.role} · {workspace.documentCount} docs
          </span>
        </Link>
      ))}
    </div>
  );
}
