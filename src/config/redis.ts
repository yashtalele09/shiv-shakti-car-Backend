import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;
let isConnected = false;

const REDIS_CONFIG = {
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    connectTimeout: 10_000,
    keepAlive: true,
    keepAliveInitialDelay: 5000,
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        console.error("[Redis] Max reconnection attempts reached. Giving up.");
        return new Error("Max reconnection retries exceeded");
      }
      const delay = Math.min(retries * 100, 3000); // exponential backoff capped at 3s
      console.warn(
        `[Redis] Reconnecting in ${delay}ms... (attempt ${retries})`
      );
      return delay;
    },
    // Uncomment for production TLS (e.g., Redis Cloud, ElastiCache)
    // tls: process.env.NODE_ENV === "production",
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB || "0"),
  // username: process.env.REDIS_USERNAME || undefined, // Redis 6+ ACL
};

export async function connectRedis() {
  if (client && isConnected) return client;

  client = createClient(REDIS_CONFIG);

  client.on("connect", () => console.log("[Redis] Connecting..."));
  client.on("ready", () => {
    isConnected = true;
    console.log("[Redis] Connected and ready");
  });
  client.on("error", (err) => {
    isConnected = false;
    console.error("[Redis] Error:", err.message);
  });
  client.on("reconnecting", () => {
    isConnected = false;
    console.warn("[Redis] Reconnecting...");
  });
  client.on("end", () => {
    isConnected = false;
    console.log("[Redis] Connection closed");
  });

  await client.connect();
  return client;
}

export function getRedisClient() {
  if (!client || !isConnected) {
    throw new Error(
      "Redis client is not connected. Call connectRedis() first."
    );
  }
  return client;
}

export async function disconnectRedis() {
  if (client) {
    await client.quit();
    client = null;
    isConnected = false;
    console.log("[Redis] Disconnected gracefully");
  }
}

export function isRedisConnected() {
  return isConnected;
}
