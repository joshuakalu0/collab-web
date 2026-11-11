import { getServerEnv } from "./env";
import { getWebRedis } from "./redis";

type ConsumeRateLimitInput = {
  limit: number;
  scope: string;
  subject: string;
  windowSeconds: number;
};

function buildRateLimitKey(input: ConsumeRateLimitInput) {
  const bucket = Math.floor(Date.now() / (input.windowSeconds * 1000));
  return `${getServerEnv().REDIS_PREFIX}:ratelimit:${input.scope}:${bucket}:${input.subject}`;
}

export function getRequestSubject(request: Request, fallback: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || fallback;
}

export async function consumeRateLimit(input: ConsumeRateLimitInput) {
  const redis = getWebRedis();
  const key = buildRateLimitKey(input);
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, input.windowSeconds);
  }

  return {
    allowed: count <= input.limit,
    headers: {
      "x-ratelimit-limit": String(input.limit),
      "x-ratelimit-remaining": String(Math.max(0, input.limit - count)),
      "x-ratelimit-reset-seconds": String(input.windowSeconds)
    },
    retryAfterSeconds: input.windowSeconds
  };
}
