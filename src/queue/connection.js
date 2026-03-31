import { Redis } from "ioredis";

const isProduction = process.env.NODE_ENV === "production";

const connectionOptions = isProduction
  ? {
      maxRetriesPerRequest: null,
      tls: {}, // required for Upstash sometimes
    }
  : {
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: null,
    };

export const redis = isProduction
  ? new Redis(process.env.REDIS_URL, connectionOptions)
  : new Redis(connectionOptions);
