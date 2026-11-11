import { apiError, apiSuccess } from "@/lib/http";
import { consumeRateLimit, getRequestSubject } from "@/lib/rate-limit";
import { getServerEnv } from "@/lib/env";
import { getViewerSession } from "@/lib/session";
import { signSocketToken, socketTokenRequestSchema } from "@booster/collab-contracts";
import { getDocumentAccessContext } from "@booster/database";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limit = await consumeRateLimit({
    limit: 20,
    scope: "socket-token",
    subject: getRequestSubject(request, "anonymous"),
    windowSeconds: 60
  });

  if (!limit.allowed) {
    return apiError(429, "rate_limited", "Too many socket token requests. Try again shortly.", {
      headers: {
        ...limit.headers,
        "retry-after": String(limit.retryAfterSeconds)
      }
    });
  }

  const session = await getViewerSession();

  if (!session?.user?.id || !session.user.email) {
    return apiError(401, "unauthorized", "Sign in before requesting a socket token.", {
      headers: limit.headers
    });
  }

  const url = new URL(request.url);
  const parsed = socketTokenRequestSchema.safeParse({
    documentId: url.searchParams.get("documentId")
  });

  if (!parsed.success) {
    return apiError(400, "validation_error", "A documentId query parameter is required.", {
      headers: limit.headers
    });
  }

  const context = await getDocumentAccessContext({
    documentId: parsed.data.documentId,
    userId: session.user.id
  });

  if (!context) {
    return apiError(403, "forbidden", "You do not have access to that document.", {
      headers: limit.headers
    });
  }

  const signed = await signSocketToken(
    {
      access: context.access,
      documentId: parsed.data.documentId,
      email: session.user.email,
      image: session.user.image ?? null,
      name: session.user.name ?? null,
      sub: session.user.id,
      workspaceId: context.workspaceId
    },
    getServerEnv().SOCKET_TOKEN_SECRET
  );

  return apiSuccess({
    expiresAt: new Date(signed.expiresAt * 1000).toISOString(),
    token: signed.token
  }, {
    headers: limit.headers
  });
}
