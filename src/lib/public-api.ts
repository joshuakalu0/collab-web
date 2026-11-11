import { getServerEnv } from "./env";
import { apiError } from "./http";
import { consumeRateLimit, getRequestSubject } from "./rate-limit";

export function buildCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getServerEnv().API_ALLOWED_ORIGINS.split(",").map((value) => value.trim());
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? "*";

  return {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-origin": allowOrigin,
    vary: "origin"
  };
}

export async function enforcePublicApiRateLimit(
  request: Request,
  input: {
    fallbackSubject: string;
    limit: number;
    scope: string;
    windowSeconds: number;
  }
) {
  const result = await consumeRateLimit({
    limit: input.limit,
    scope: input.scope,
    subject: getRequestSubject(request, input.fallbackSubject),
    windowSeconds: input.windowSeconds
  });

  const headers = {
    ...buildCorsHeaders(request),
    ...result.headers
  };

  if (!result.allowed) {
    return {
      error: apiError(429, "rate_limited", "Too many API requests. Try again shortly.", {
        headers: {
          ...headers,
          "retry-after": String(result.retryAfterSeconds)
        }
      }),
      headers
    };
  }

  return {
    error: null,
    headers
  };
}

export function handleOptions(request: Request) {
  return new Response(null, {
    headers: buildCorsHeaders(request),
    status: 204
  });
}
