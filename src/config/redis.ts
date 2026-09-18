import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;
let isConnected = false;

const redisUrl = process.env.REDIS_URL;

export async function connectRedis() {
  if (client && isConnected) return client;

  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 10_000,
      keepAlive: true,
      keepAliveInitialDelay: 5000,
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error("[Redis] Max reconnection attempts reached.");
          return new Error("Max reconnection retries exceeded");
        }

        const delay = Math.min(retries * 100, 3000);

        console.warn(
          `[Redis] Reconnecting in ${delay}ms... (attempt ${retries})`
        );

        return delay;
      },
    },
  });

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
