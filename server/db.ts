import { eq, and, avg, count, sql, notInArray, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, restaurants, ratings, blacklist } from "../drizzle/schema";
import type { InsertRestaurant, InsertRating, InsertBlacklist } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== Restaurant Queries ====================

export async function getAllRestaurants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(restaurants).orderBy(restaurants.createdAt);
}

export async function getRestaurantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
  return result[0];
}

export async function createRestaurant(data: Omit<InsertRestaurant, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(restaurants).values(data);
  return { id: result[0].insertId };
}

export async function createRestaurantsBatch(items: Omit<InsertRestaurant, "id">[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return [];
  await db.insert(restaurants).values(items);
  return items;
}

export async function updateRestaurant(id: number, data: Partial<Pick<InsertRestaurant, "name" | "description" | "category">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(restaurants).set(data).where(eq(restaurants.id, id));
}

export async function deleteRestaurant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Also remove related ratings and blacklist entries
  await db.delete(ratings).where(eq(ratings.restaurantId, id));
  await db.delete(blacklist).where(eq(blacklist.restaurantId, id));
  await db.delete(restaurants).where(eq(restaurants.id, id));
}

// ==================== Rating Queries ====================

export async function upsertRating(userId: number, restaurantId: number, score: number, comment?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(ratings).values({
    userId,
    restaurantId,
    score,
    comment: comment ?? null,
  }).onDuplicateKeyUpdate({
    set: { score, comment: comment ?? null },
  });
}

export async function getUserRating(userId: number, restaurantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ratings)
    .where(and(eq(ratings.userId, userId), eq(ratings.restaurantId, restaurantId)))
    .limit(1);
  return result[0];
}

export async function getRestaurantRatings(restaurantId: number) {
  const db = await getDb();
  if (!db) return { average: 0, count: 0 };
  const result = await db.select({
    average: avg(ratings.score),
    count: count(),
  }).from(ratings).where(eq(ratings.restaurantId, restaurantId));
  return {
    average: result[0]?.average ? parseFloat(result[0].average) : 0,
    count: result[0]?.count ?? 0,
  };
}

export async function getAllRatingsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ratings).where(eq(ratings.userId, userId));
}

export async function getAverageRatingsForAll() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    restaurantId: ratings.restaurantId,
    average: avg(ratings.score),
    count: count(),
  }).from(ratings).groupBy(ratings.restaurantId);
}

// ==================== Blacklist Queries ====================

export async function getUserBlacklist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blacklist).where(eq(blacklist.userId, userId));
}

export async function addToBlacklist(userId: number, restaurantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(blacklist).values({ userId, restaurantId }).onDuplicateKeyUpdate({
    set: { userId },
  });
}

export async function removeFromBlacklist(userId: number, restaurantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blacklist).where(
    and(eq(blacklist.userId, userId), eq(blacklist.restaurantId, restaurantId))
  );
}

// ==================== Random Pick Logic ====================

export async function getRestaurantsForPick(userId: number, useWeights: boolean) {
  const db = await getDb();
  if (!db) return [];

  // Get user's blacklist
  const userBlacklist = await getUserBlacklist(userId);
  const blacklistedIds = userBlacklist.map(b => b.restaurantId);

  // Get all restaurants excluding blacklisted ones
  let availableRestaurants;
  if (blacklistedIds.length > 0) {
    availableRestaurants = await db.select().from(restaurants)
      .where(notInArray(restaurants.id, blacklistedIds));
  } else {
    availableRestaurants = await db.select().from(restaurants);
  }

  if (!useWeights) {
    return availableRestaurants.map(r => ({ ...r, weight: 1 }));
  }

  // Get average ratings for weighting
  const ratingsData = await getAverageRatingsForAll();
  const ratingsMap = new Map(ratingsData.map(r => [r.restaurantId, parseFloat(r.average ?? "0")]));

  return availableRestaurants.map(r => ({
    ...r,
    weight: ratingsMap.get(r.id) || 3, // Default weight of 3 (middle) for unrated
  }));
}
