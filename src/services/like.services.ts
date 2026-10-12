import { validate as isUuid } from "uuid";
import Like from "../models/like";
import { getRedisClient, isRedisConnected } from "../config/redis";

// Only logged-in users can like. Guests cannot be represented at all.
export type Actor = { type: "user"; id: string };

// Lets the controller tell validation errors (400) from server errors (500)
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Cache TTLs (seconds). The set must outlive the "loaded" flag, so when the
// flag expires the set is always rebuilt from Mongo (never the other way round).
const LOADED_TTL = 60 * 60; // 1 hour: how often we re-sync from Mongo
const SET_TTL = 2 * 60 * 60; // 2 hours

const likesKey = (vehicleId: string) => `vehicle:likes:${vehicleId}`;
const loadedKey = (vehicleId: string) => `vehicle:likes:loaded:${vehicleId}`;
const member = (actor: Actor) => `u:${actor.id}`;
const actorFilter = (actor: Actor) => ({ userId: actor.id });

// Ignores any legacy guest rows (userId: null) that may still be in Mongo
const USER_ONLY = { userId: { $type: "string" as const } };

// Atomic toggle: returns [liked (0/1), count]. Refreshes the set TTL too.
const TOGGLE_LUA = `
if redis.call('SISMEMBER', KEYS[1], ARGV[1]) == 1 then
  redis.call('SREM', KEYS[1], ARGV[1])
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  return {0, redis.call('SCARD', KEYS[1])}
else
  redis.call('SADD', KEYS[1], ARGV[1])
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  return {1, redis.call('SCARD', KEYS[1])}
end
`;

// sIsMember returns boolean (v4) or 0/1 (v5) depending on node-redis version
const toBool = (v: unknown) => v === true || Number(v) === 1;

const assertValidId = (vehicleId: string) => {
  if (!isUuid(vehicleId)) {
    throw new ValidationError("Invalid vehicle id");
  }
};

// Best-effort: drop cached keys so the next read rebuilds from Mongo.
// Never throws (Redis may be the thing that's broken).
const invalidateCache = async (vehicleId: string) => {
  try {
    if (!isRedisConnected()) return;
    const redis = getRedisClient();
    await redis.del([likesKey(vehicleId), loadedKey(vehicleId)]);
  } catch (error) {
    console.error("[likeService.invalidateCache] failed:", error);
  }
};

// Rebuild the Redis set from Mongo if it was never loaded (or expired/evicted).
// The set is REPLACED (not merged), so stale members can never survive.
const warmCache = async (vehicleId: string) => {
  const redis = getRedisClient();

  const loaded = await redis.exists(loadedKey(vehicleId));
  if (loaded) return;

  const likes = await Like.find({ vehicleId, ...USER_ONLY })
    .select("userId")
    .lean();
  const members = likes.map((l) => `u:${l.userId}`);

  const multi = redis.multi();
  multi.del(likesKey(vehicleId));
  if (members.length) {
    multi.sAdd(likesKey(vehicleId), members);
    multi.expire(likesKey(vehicleId), SET_TTL);
  }
  multi.set(loadedKey(vehicleId), "1", { EX: LOADED_TTL });
  await multi.exec();
};

const toggleLike = async (vehicleId: string, actor: Actor) => {
  assertValidId(vehicleId);

  if (isRedisConnected()) {
    try {
      const redis = getRedisClient();
      await warmCache(vehicleId);

      const [liked, count] = (await redis.eval(TOGGLE_LUA, {
        keys: [likesKey(vehicleId)],
        arguments: [member(actor), String(SET_TTL)],
      })) as [number, number];

      // Persist to Mongo (source of truth); roll back Redis if it fails
      try {
        if (liked === 1) {
          await Like.updateOne(
            { ...actorFilter(actor), vehicleId },
            { $setOnInsert: { ...actorFilter(actor), vehicleId } },
            { upsert: true }
          );
        } else {
          await Like.deleteOne({ ...actorFilter(actor), vehicleId });
        }
      } catch (dbError) {
        if (liked === 1) await redis.sRem(likesKey(vehicleId), member(actor));
        else await redis.sAdd(likesKey(vehicleId), member(actor));
        throw dbError;
      }

      return { liked: liked === 1, likesCount: count };
    } catch (error) {
      console.error(
        "[likeService.toggleLike] Redis failed, using Mongo:",
        error
      );
    }
  }

  // Mongo-only fallback
  const filter = { ...actorFilter(actor), vehicleId };
  const existing = await Like.findOne(filter).select("_id").lean();

  if (existing) {
    await Like.deleteOne({ _id: existing._id });
  } else {
    await Like.updateOne(filter, { $setOnInsert: filter }, { upsert: true });
  }

  // Mongo changed without Redis knowing -> force a rebuild on next read
  await invalidateCache(vehicleId);

  const likesCount = await Like.countDocuments({ vehicleId, ...USER_ONLY });
  return { liked: !existing, likesCount };
};

const getLikeStatus = async (vehicleId: string, actor?: Actor | null) => {
  assertValidId(vehicleId);

  if (isRedisConnected()) {
    try {
      const redis = getRedisClient();
      await warmCache(vehicleId);

      const multi = redis.multi();
      multi.sCard(likesKey(vehicleId));
      if (actor) multi.sIsMember(likesKey(vehicleId), member(actor));
      const res = (await multi.exec()) as unknown[];

      return {
        likesCount: Number(res[0] ?? 0),
        liked: actor ? toBool(res[1]) : false,
      };
    } catch (error) {
      console.error(
        "[likeService.getLikeStatus] Redis failed, using Mongo:",
        error
      );
    }
  }

  const [likesCount, mine] = await Promise.all([
    Like.countDocuments({ vehicleId, ...USER_ONLY }),
    actor
      ? Like.exists({ ...actorFilter(actor), vehicleId })
      : Promise.resolve(null),
  ]);

  return { likesCount, liked: !!mine };
};

const getBulkLikes = async (vehicleIds: string[], actor?: Actor | null) => {
  const ids = [...new Set(vehicleIds)].filter((id) => isUuid(id)).slice(0, 50);

  const result: Record<string, { likesCount: number; liked: boolean }> = {};
  if (!ids.length) return result;

  if (isRedisConnected()) {
    try {
      const redis = getRedisClient();
      await Promise.all(ids.map((id) => warmCache(id)));

      const multi = redis.multi();
      ids.forEach((id) => {
        multi.sCard(likesKey(id));
        if (actor) multi.sIsMember(likesKey(id), member(actor));
      });
      const res = (await multi.exec()) as unknown[];

      const step = actor ? 2 : 1;
      ids.forEach((id, i) => {
        result[id] = {
          likesCount: Number(res[i * step] ?? 0),
          liked: actor ? toBool(res[i * step + 1]) : false,
        };
      });
      return result;
    } catch (error) {
      console.error(
        "[likeService.getBulkLikes] Redis failed, using Mongo:",
        error
      );
    }
  }

  const counts = await Like.aggregate([
    { $match: { vehicleId: { $in: ids }, ...USER_ONLY } },
    { $group: { _id: "$vehicleId", count: { $sum: 1 } } },
  ]);
  const mine = actor
    ? await Like.find({ ...actorFilter(actor), vehicleId: { $in: ids } })
        .select("vehicleId")
        .lean()
    : [];

  const likedSet = new Set(mine.map((m) => String(m.vehicleId)));
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  ids.forEach((id) => {
    result[id] = {
      likesCount: countMap.get(id) ?? 0,
      liked: likedSet.has(id),
    };
  });
  return result;
};

const getMyLikedVehicleIds = async (actor: Actor) => {
  const likes = await Like.find(actorFilter(actor))
    .sort({ createdAt: -1 })
    .select("vehicleId")
    .lean();
  return likes.map((l) => String(l.vehicleId));
};

const likeService = {
  toggleLike,
  getLikeStatus,
  getBulkLikes,
  getMyLikedVehicleIds,
  invalidateCache, // handy if you ever edit/delete likes from an admin tool
};

export default likeService;
