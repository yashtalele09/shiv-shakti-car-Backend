import { validate as isUuid } from "uuid";
import Like from "../models/like";
import { getRedisClient, isRedisConnected } from "../config/redis";

export type Actor =
  | { type: "user"; id: string }
  | { type: "guest"; id: string };

const likesKey = (vehicleId: string) => `vehicle:likes:${vehicleId}`;
const loadedKey = (vehicleId: string) => `vehicle:likes:loaded:${vehicleId}`;
const member = (actor: Actor) =>
  `${actor.type === "user" ? "u" : "g"}:${actor.id}`;
const actorFilter = (actor: Actor) =>
  actor.type === "user" ? { userId: actor.id } : { guestId: actor.id };

// Atomic toggle: returns [liked (0/1), count]
const TOGGLE_LUA = `
if redis.call('SISMEMBER', KEYS[1], ARGV[1]) == 1 then
  redis.call('SREM', KEYS[1], ARGV[1])
  return {0, redis.call('SCARD', KEYS[1])}
else
  redis.call('SADD', KEYS[1], ARGV[1])
  return {1, redis.call('SCARD', KEYS[1])}
end
`;

// sIsMember returns boolean (v4) or 0/1 (v5) depending on node-redis version
const toBool = (v: unknown) => v === true || Number(v) === 1;

const assertValidId = (vehicleId: string) => {
  if (!isUuid(vehicleId)) {
    throw new Error("Invalid vehicle id");
  }
};

// Rebuild the Redis set from Mongo if it was never loaded (or got evicted)
const warmCache = async (vehicleId: string) => {
  const redis = getRedisClient();

  const loaded = await redis.exists(loadedKey(vehicleId));
  if (loaded) return;

  const likes = await Like.find({ vehicleId }).select("userId guestId").lean();
  const members = likes.map((l) =>
    l.userId ? `u:${l.userId}` : `g:${l.guestId}`
  );

  const multi = redis.multi();
  if (members.length) multi.sAdd(likesKey(vehicleId), members);
  multi.set(loadedKey(vehicleId), "1");
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
        arguments: [member(actor)],
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

  const likesCount = await Like.countDocuments({ vehicleId });
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
    Like.countDocuments({ vehicleId }),
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
    { $match: { vehicleId: { $in: ids } } },
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
};

export default likeService;
