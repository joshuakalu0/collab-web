import { getServerEnv } from "./env";

export async function syncDocumentRealtimeSnapshot(input: {
  content: string;
  documentId: string;
  revision: number;
  savedAt: string | null;
  updatedById: string | null;
}) {
  const env = getServerEnv();
  const secret = env.SOCKET_INTERNAL_SECRET ?? env.SOCKET_TOKEN_SECRET;

  try {
    await fetch(`${env.NEXT_PUBLIC_SOCKET_URL}/internal/documents/${input.documentId}/snapshot`, {
      body: JSON.stringify({
        content: input.content,
        revision: input.revision,
        savedAt: input.savedAt,
        updatedById: input.updatedById
      }),
      headers: {
        "content-type": "application/json",
        "x-internal-secret": secret
      },
      method: "POST"
    });
  } catch (error) {
    console.error("[collab-web] failed to sync realtime snapshot", error);
  }
}
