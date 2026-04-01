import { Redis } from "ioredis";

const isProd = !!process.env.REDIS_URL;

let redis;

if (isProd) {
  const url = new URL(process.env.REDIS_URL);

  redis = new Redis({
    host: url.hostname,
    port: Number(url.port),
    username: url.username,
    password: url.password,
    tls: {}, // REQUIRED for Upstash
    maxRetriesPerRequest: null,
  });
} else {
  redis = new Redis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
  });
}

export { redis };
