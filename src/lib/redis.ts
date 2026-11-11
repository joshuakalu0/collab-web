import Redis from "ioredis";

import { getServerEnv } from "./env";

let client: Redis | null = null;

export function getWebRedis() {
  if (!client) {
    client = new Redis(getServerEnv().REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: null
    });
  }

  return client;
}
