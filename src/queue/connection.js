import { Redis } from "ioredis";

const isProd = !!process.env.REDIS_URL;

export const redis = isProd
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      tls: {},
    })
  : new Redis({
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: null,
    });
