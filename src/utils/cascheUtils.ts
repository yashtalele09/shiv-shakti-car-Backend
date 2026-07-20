// utils/cache.util.ts (or wherever your other cache-invalidation helpers live)
import { getRedisClient, isRedisConnected } from "../config/redis";

export async function invalidateVehicleListCache() {
  if (!isRedisConnected()) return;

  try {
    const client = getRedisClient();
    let cursor = "0";
    const keysToDelete: string[] = [];

    do {
      const result = await client.scan(cursor, {
        MATCH: "vehicles:list:*",
        COUNT: 100,
      });
      cursor = result.cursor;
      keysToDelete.push(...result.keys);
    } while (cursor !== "0");

    if (keysToDelete.length > 0) {
      await client.del(keysToDelete);
      console.log(
        `[Redis] Invalidated ${keysToDelete.length} vehicle list cache keys`
      );
    }
  } catch (err) {
    console.error("[Redis] Cache invalidation failed:", err);
  }
}
