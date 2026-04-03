import { Redis } from "ioredis";

const isProd = process.env.NODE_ENV === "production";

let redis;

if (isProd) {
  const url = new URL(process.env.REDIS_URL);

  redis = new Redis({
    host: url.hostname,
    port: Number(url.port),
    username: url.username,
    password: url.password,
    tls: {}, // required for Upstash
    maxRetriesPerRequest: null,

    // 🔥 ADD THESE (important)
    connectTimeout: 10000, // fail if can't connect in 10s
    lazyConnect: false,
  });
} else {
  redis = new Redis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
  });
}

// 🔥 ADD DEBUG LOGS (CRITICAL)
redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("ready", () => {
  console.log("🚀 Redis ready");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

export { redis };
