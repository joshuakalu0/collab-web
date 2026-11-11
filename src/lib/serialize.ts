import type { CollaboratorDescriptor, DocumentDetail, DocumentSummary } from "@booster/collab-contracts";
import {
  collaboratorDescriptorSchema,
  documentDetailSchema,
  documentSummarySchema,
  documentVersionSchema
} from "@booster/collab-contracts";
import type { AccessibleDocumentRecord } from "@booster/database";

export function serializeCollaborator(collaborator: CollaboratorDescriptor) {
  return collaboratorDescriptorSchema.parse(collaborator);
}

export function serializeDocumentDetail(document: NonNullable<AccessibleDocumentRecord>): DocumentDetail {
  return documentDetailSchema.parse({
    ...document,
    collaborators: document.collaborators.map(serializeCollaborator),
    lastSavedAt: document.lastSavedAt?.toISOString() ?? null,
    updatedAt: document.updatedAt.toISOString(),
    versions: document.versions.map((version) =>
      documentVersionSchema.parse({
        ...version,
        savedAt: version.savedAt.toISOString()
      })
    )
  });
}

export function serializeDocumentSummary(document: {
  access: "EDIT" | "VIEW";
  collaboratorCount: number;
  id: string;
  isOwner: boolean;
  lastSavedAt: Date | null;
  preview: string;
  shared: boolean;
  title: string;
  updatedAt: Date;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
}): DocumentSummary {
  return documentSummarySchema.parse({
    ...document,
    lastSavedAt: document.lastSavedAt?.toISOString() ?? null,
    updatedAt: document.updatedAt.toISOString()
  });
}
