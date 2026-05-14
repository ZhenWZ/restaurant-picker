import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", () => ({
  getAllRestaurants: vi.fn().mockResolvedValue([
    { id: 1, name: "海底捞", description: "火锅", category: "火锅", createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "麦当劳", description: null, category: "快餐", createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, name: "西贝", description: "西北菜", category: "中餐", createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getRestaurantById: vi.fn().mockImplementation(async (id: number) => {
    const restaurants: Record<number, any> = {
      1: { id: 1, name: "海底捞", description: "火锅", category: "火锅", createdBy: 1 },
      2: { id: 2, name: "麦当劳", description: null, category: "快餐", createdBy: 1 },
    };
    return restaurants[id] || undefined;
  }),
  createRestaurant: vi.fn().mockResolvedValue({ id: 4 }),
  createRestaurantsBatch: vi.fn().mockResolvedValue([]),
  updateRestaurant: vi.fn().mockResolvedValue(undefined),
  deleteRestaurant: vi.fn().mockResolvedValue(undefined),
  upsertRating: vi.fn().mockResolvedValue(undefined),
  getUserRating: vi.fn().mockResolvedValue({ id: 1, userId: 1, restaurantId: 1, score: 4, comment: null }),
  getRestaurantRatings: vi.fn().mockResolvedValue({ average: 4.2, count: 5 }),
  getAllRatingsForUser: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, restaurantId: 1, score: 4, comment: null },
  ]),
  getAverageRatingsForAll: vi.fn().mockResolvedValue([
    { restaurantId: 1, average: "4.5", count: 3 },
    { restaurantId: 2, average: "3.8", count: 2 },
  ]),
  getUserBlacklist: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, restaurantId: 2, createdAt: new Date() },
  ]),
  addToBlacklist: vi.fn().mockResolvedValue(undefined),
  removeFromBlacklist: vi.fn().mockResolvedValue(undefined),
  getRestaurantsForPick: vi.fn().mockResolvedValue([
    { id: 1, name: "海底捞", description: "火锅", category: "火锅", createdBy: 1, weight: 4.5 },
    { id: 3, name: "西贝", description: "西北菜", category: "中餐", createdBy: 1, weight: 3 },
  ]),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("restaurant.list", () => {
  it("returns all restaurants with ratings (public)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.restaurant.list();

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty("name", "海底捞");
    expect(result[0]).toHaveProperty("rating");
    expect(result[0].rating).toHaveProperty("average");
    expect(result[0].rating).toHaveProperty("count");
  });
});

describe("restaurant.create", () => {
  it("creates a restaurant for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.restaurant.create({
      name: "新餐厅",
      description: "好吃的",
      category: "中餐",
    });

    expect(result).toHaveProperty("id", 4);
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.restaurant.create({ name: "测试" })
    ).rejects.toThrow();
  });
});

describe("restaurant.batchCreate", () => {
  it("batch creates restaurants", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.restaurant.batchCreate({
      restaurants: [
        { name: "餐厅A" },
        { name: "餐厅B", category: "日料" },
        { name: "餐厅C", description: "好吃" },
      ],
    });

    expect(result).toHaveProperty("count", 3);
  });
});

describe("restaurant.update (admin only)", () => {
  it("allows admin to update restaurant", async () => {
    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.restaurant.update({
      id: 1,
      name: "海底捞（新名字）",
    });

    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin users", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.restaurant.update({ id: 1, name: "test" })
    ).rejects.toThrow("需要管理员权限");
  });
});

describe("restaurant.delete (admin only)", () => {
  it("allows admin to delete restaurant", async () => {
    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.restaurant.delete({ id: 1 });

    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin users", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.restaurant.delete({ id: 1 })
    ).rejects.toThrow("需要管理员权限");
  });
});

describe("restaurant.randomPick", () => {
  it("returns 3 picks for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.restaurant.randomPick({ useWeights: false });

    expect(result).toHaveLength(3);
    result.forEach((pick) => {
      expect(pick).toHaveProperty("id");
      expect(pick).toHaveProperty("name");
    });
  });

  it("supports weighted picks", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.restaurant.randomPick({ useWeights: true });

    expect(result).toHaveLength(3);
  });
});

describe("rating.upsert", () => {
  it("allows user to rate a restaurant", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rating.upsert({
      restaurantId: 1,
      score: 5,
      comment: "非常好吃",
    });

    expect(result).toEqual({ success: true });
  });

  it("validates score range", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.rating.upsert({ restaurantId: 1, score: 6 })
    ).rejects.toThrow();

    await expect(
      caller.rating.upsert({ restaurantId: 1, score: 0 })
    ).rejects.toThrow();
  });
});

describe("rating - invalid restaurant", () => {
  it("rejects rating for non-existent restaurant", async () => {
    const { getRestaurantById } = await import("./db");
    (getRestaurantById as any).mockResolvedValueOnce(undefined);
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.rating.upsert({ restaurantId: 999, score: 5 })
    ).rejects.toThrow("餐厅不存在");
  });
});

describe("blacklist - invalid restaurant", () => {
  it("rejects adding non-existent restaurant to blacklist", async () => {
    const { getRestaurantById } = await import("./db");
    (getRestaurantById as any).mockResolvedValueOnce(undefined);
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.blacklist.add({ restaurantId: 999 })
    ).rejects.toThrow("餐厅不存在");
  });
});

describe("blacklist", () => {
  it("returns user blacklist", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.blacklist.list();

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("restaurantId", 2);
  });

  it("adds to blacklist", async () => {
    const { getRestaurantById } = await import("./db");
    (getRestaurantById as any).mockResolvedValueOnce({ id: 3, name: "西贝", description: null, category: "中餐", createdBy: 1 });
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.blacklist.add({ restaurantId: 3 });

    expect(result).toEqual({ success: true });
  });

  it("removes from blacklist", async () => {
    const { getRestaurantById } = await import("./db");
    (getRestaurantById as any).mockResolvedValueOnce({ id: 2, name: "麦当劳", description: null, category: "快餐", createdBy: 1 });
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.blacklist.remove({ restaurantId: 2 });

    expect(result).toEqual({ success: true });
  });
});
