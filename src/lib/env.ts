import { z } from "zod";

const serverEnvSchema = z.object({
  API_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SOCKET_URL: z.string().url().default("http://localhost:4001"),
  REDIS_PREFIX: z.string().min(1).default("booster:collab"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  SOCKET_INTERNAL_SECRET: z.string().min(32).optional(),
  SOCKET_TOKEN_SECRET: z.string().min(32)
});

let cachedServerEnv: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv() {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  cachedServerEnv = serverEnvSchema.parse({
    ...process.env,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4001"
  });

  return cachedServerEnv;
}

export function getPublicEnv() {
  const env = getServerEnv();

  return {
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SOCKET_URL: env.NEXT_PUBLIC_SOCKET_URL
  };
}
