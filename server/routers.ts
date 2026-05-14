import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";
import {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  createRestaurantsBatch,
  updateRestaurant,
  deleteRestaurant,
  upsertRating,
  getUserRating,
  getRestaurantRatings,
  getAllRatingsForUser,
  getAverageRatingsForAll,
  getUserBlacklist,
  addToBlacklist,
  removeFromBlacklist,
  getRestaurantsForPick,
  getUserByUsername,
  createUserWithPassword,
} from "./db";

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

// Helper to create JWT token
async function createToken(userId: number) {
  const secret = new TextEncoder().encode(ENV.jwtSecret);
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
  return token;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Register with username/password
    register: publicProcedure.input(z.object({
      username: z.string().min(3, "用户名至少3个字符").max(32, "用户名最多32个字符").regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名只能包含字母、数字、下划线和中文"),
      password: z.string().min(6, "密码至少6个字符").max(64),
      name: z.string().min(1, "昵称不能为空").max(32),
    })).mutation(async ({ ctx, input }) => {
      // Check if username already exists
      const existing = await getUserByUsername(input.username);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "该用户名已被注册" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create user
      const user = await createUserWithPassword(input.username, passwordHash, input.name);
      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "注册失败，请稍后重试" });
      }

      // Create session token and set cookie
      const token = await createToken(user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

      return {
        success: true,
        user: { id: user.id, name: user.name, username: user.username, role: user.role },
      };
    }),

    // Login with username/password
    login: publicProcedure.input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    })).mutation(async ({ ctx, input }) => {
      const user = await getUserByUsername(input.username);
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
      }

      // Create session token and set cookie
      const token = await createToken(user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

      return {
        success: true,
        user: { id: user.id, name: user.name, username: user.username, role: user.role },
      };
    }),
  }),

  restaurant: router({
    // List all restaurants with their average ratings
    list: publicProcedure.query(async () => {
      const allRestaurants = await getAllRestaurants();
      const ratingsData = await getAverageRatingsForAll();
      const ratingsMap = new Map(ratingsData.map(r => [r.restaurantId, { average: parseFloat(r.average ?? "0"), count: r.count }]));
      
      return allRestaurants.map(r => ({
        ...r,
        rating: ratingsMap.get(r.id) || { average: 0, count: 0 },
      }));
    }),

    // Get single restaurant details
    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const restaurant = await getRestaurantById(input.id);
      if (!restaurant) throw new TRPCError({ code: "NOT_FOUND", message: "餐厅不存在" });
      const ratingInfo = await getRestaurantRatings(input.id);
      return { ...restaurant, rating: ratingInfo };
    }),

    // Add a single restaurant
    create: protectedProcedure.input(z.object({
      name: z.string().min(1, "餐厅名称不能为空").max(255),
      description: z.string().max(500).optional(),
      category: z.string().max(100).optional(),
      emoji: z.string().max(32).optional(),
    })).mutation(async ({ ctx, input }) => {
      return createRestaurant({
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? null,
        emoji: input.emoji ?? null,
        createdBy: ctx.user.id,
      });
    }),

    // Batch add restaurants
    batchCreate: protectedProcedure.input(z.object({
      restaurants: z.array(z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(500).optional(),
        category: z.string().max(100).optional(),
        emoji: z.string().max(32).optional(),
      })).min(1).max(100),
    })).mutation(async ({ ctx, input }) => {
      const items = input.restaurants.map(r => ({
        name: r.name,
        description: r.description ?? null,
        category: r.category ?? null,
        emoji: r.emoji ?? null,
        createdBy: ctx.user.id,
      }));
      await createRestaurantsBatch(items);
      return { count: items.length };
    }),

    // Update restaurant (admin only)
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().max(500).optional(),
      category: z.string().max(100).optional(),
      emoji: z.string().max(32).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const existing = await getRestaurantById(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "餐厅不存在" });
      await updateRestaurant(id, data);
      return { success: true };
    }),

    // Delete restaurant (admin only)
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const existing = await getRestaurantById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "餐厅不存在" });
      await deleteRestaurant(input.id);
      return { success: true };
    }),

    // Random pick - returns 3 restaurants for slot machine (public, no login required)
    randomPick: publicProcedure.input(z.object({
      useWeights: z.boolean().default(false),
    })).mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id ?? null;
      const available = await getRestaurantsForPick(userId, input.useWeights);
      
      if (available.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "没有可用的餐厅，请先添加餐厅或调整黑名单" });
      }

      // Weighted random selection function
      const weightedRandom = (items: typeof available) => {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        for (const item of items) {
          random -= item.weight;
          if (random <= 0) return item;
        }
        return items[items.length - 1];
      };

      // Pick 3 restaurants (can be duplicates for slot machine effect)
      const picks = [
        weightedRandom(available),
        weightedRandom(available),
        weightedRandom(available),
      ];

      return picks.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        emoji: p.emoji,
      }));
    }),
  }),

  rating: router({
    // Rate a restaurant
    upsert: protectedProcedure.input(z.object({
      restaurantId: z.number(),
      score: z.number().min(1).max(5),
      comment: z.string().max(500).optional(),
    })).mutation(async ({ ctx, input }) => {
      const restaurant = await getRestaurantById(input.restaurantId);
      if (!restaurant) throw new TRPCError({ code: "NOT_FOUND", message: "餐厅不存在" });
      await upsertRating(ctx.user.id, input.restaurantId, input.score, input.comment);
      return { success: true };
    }),

    // Get user's rating for a restaurant
    getUserRating: protectedProcedure.input(z.object({
      restaurantId: z.number(),
    })).query(async ({ ctx, input }) => {
      return getUserRating(ctx.user.id, input.restaurantId);
    }),

    // Get all ratings for a restaurant
    getForRestaurant: publicProcedure.input(z.object({
      restaurantId: z.number(),
    })).query(async ({ input }) => {
      return getRestaurantRatings(input.restaurantId);
    }),

    // Get all user's ratings
    myRatings: protectedProcedure.query(async ({ ctx }) => {
      return getAllRatingsForUser(ctx.user.id);
    }),
  }),

  blacklist: router({
    // Get user's blacklist
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserBlacklist(ctx.user.id);
    }),

    // Add to blacklist
    add: protectedProcedure.input(z.object({
      restaurantId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const restaurant = await getRestaurantById(input.restaurantId);
      if (!restaurant) throw new TRPCError({ code: "NOT_FOUND", message: "餐厅不存在" });
      await addToBlacklist(ctx.user.id, input.restaurantId);
      return { success: true };
    }),

    // Remove from blacklist
    remove: protectedProcedure.input(z.object({
      restaurantId: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const restaurant = await getRestaurantById(input.restaurantId);
      if (!restaurant) throw new TRPCError({ code: "NOT_FOUND", message: "餐厅不存在" });
      await removeFromBlacklist(ctx.user.id, input.restaurantId);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
