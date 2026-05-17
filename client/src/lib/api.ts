import type { Provider, Session } from "@supabase/supabase-js";
import type {
  BlacklistEntry,
  PickResult,
  Profile,
  Rating,
  Restaurant,
  RestaurantWithRating,
} from "@shared/types";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "./authValidation";
import type { Database } from "./database.types";
import { requireSupabaseConfig, supabase } from "./supabase";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type RestaurantRow = Database["public"]["Tables"]["restaurants"]["Row"];
type RatingRow = Database["public"]["Tables"]["ratings"]["Row"];
type BlacklistRow = Database["public"]["Tables"]["blacklist"]["Row"];

type AuthFunctionResult = {
  session: Session;
  profile: Profile;
};

type RestaurantInput = {
  name: string;
  description?: string | null;
  category?: string | null;
  emoji?: string | null;
};

function asErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function throwIfError(error: unknown, fallback: string): asserts error is null {
  if (!error) return;
  throw new Error(asErrorMessage(error, fallback));
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.user_id,
    email: row.email,
    username: row.username,
    name: row.name,
    role: row.role,
    loginMethod: row.login_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSignedIn: row.last_signed_in,
  };
}

function toRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    category: row.category,
    emoji: row.emoji,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRating(row: RatingRow): Rating {
  return {
    id: Number(row.id),
    userId: row.user_id,
    restaurantId: Number(row.restaurant_id),
    score: row.score,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toBlacklistEntry(row: BlacklistRow): BlacklistEntry {
  return {
    id: Number(row.id),
    userId: row.user_id,
    restaurantId: Number(row.restaurant_id),
    createdAt: row.created_at,
  };
}

async function getRequiredUserId() {
  requireSupabaseConfig();
  const { data, error } = await supabase.auth.getUser();
  throwIfError(error, "请先登录");
  if (!data.user) throw new Error("请先登录");
  return data.user.id;
}

async function invokeFunction<T>(name: string, body?: Record<string, unknown>) {
  requireSupabaseConfig();
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
  });
  throwIfError(error, "请求失败");
  if (!data) throw new Error("服务返回为空");
  return data;
}

export async function getCurrentProfile() {
  requireSupabaseConfig();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  throwIfError(userError, "获取登录状态失败");
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  throwIfError(error, "获取用户资料失败");

  if (data) return toProfile(data);

  const synced = await invokeFunction<Profile>("profile-sync");
  return synced;
}

export async function registerWithPassword(input: RegisterInput) {
  const payload = registerSchema.parse(input);
  const result = await invokeFunction<AuthFunctionResult>("auth-register", payload);
  await supabase.auth.setSession({
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token,
  });
  return result.profile;
}

export async function loginWithPassword(input: LoginInput) {
  const payload = loginSchema.parse(input);
  const result = await invokeFunction<AuthFunctionResult>("auth-password-login", payload);
  await supabase.auth.setSession({
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token,
  });
  return result.profile;
}

export async function signOut() {
  requireSupabaseConfig();
  const { error } = await supabase.auth.signOut();
  throwIfError(error, "退出登录失败");
}

export async function signInWithOAuth(provider: Provider) {
  requireSupabaseConfig();
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL || "/"}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });
  throwIfError(error, "第三方登录启动失败");
}

export async function listRestaurants(): Promise<RestaurantWithRating[]> {
  requireSupabaseConfig();
  const [restaurantResult, statsResult] = await Promise.all([
    supabase.from("restaurants").select("*").order("created_at", { ascending: true }),
    supabase.rpc("get_restaurant_rating_stats"),
  ]);

  throwIfError(restaurantResult.error, "加载餐厅失败");
  throwIfError(statsResult.error, "加载评分失败");

  const stats = new Map(
    (statsResult.data ?? []).map(item => [
      Number(item.restaurant_id),
      {
        average: item.average ? Number(item.average) : 0,
        count: Number(item.count ?? 0),
      },
    ]),
  );

  return (restaurantResult.data ?? []).map(row => ({
    ...toRestaurant(row),
    rating: stats.get(Number(row.id)) ?? { average: 0, count: 0 },
  }));
}

export async function createRestaurant(input: RestaurantInput) {
  const userId = await getRequiredUserId();
  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      emoji: input.emoji ?? null,
      created_by: userId,
    })
    .select("id")
    .single();
  throwIfError(error, "添加餐厅失败");
  return { id: Number(data.id) };
}

export async function createRestaurantsBatch(items: RestaurantInput[]) {
  const userId = await getRequiredUserId();
  if (items.length === 0) return { count: 0 };
  const { error } = await supabase.from("restaurants").insert(
    items.map(item => ({
      name: item.name,
      description: item.description ?? null,
      category: item.category ?? null,
      emoji: item.emoji ?? null,
      created_by: userId,
    })),
  );
  throwIfError(error, "批量添加餐厅失败");
  return { count: items.length };
}

export async function updateRestaurant(
  id: number,
  input: Partial<Pick<RestaurantInput, "name" | "description" | "category" | "emoji">>,
) {
  requireSupabaseConfig();
  const { error } = await supabase
    .from("restaurants")
    .update({
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      emoji: input.emoji ?? null,
    })
    .eq("id", id);
  throwIfError(error, "更新餐厅失败");
  return { success: true };
}

export async function deleteRestaurant(id: number) {
  requireSupabaseConfig();
  const { error } = await supabase.from("restaurants").delete().eq("id", id);
  throwIfError(error, "删除餐厅失败");
  return { success: true };
}

export async function upsertRating(restaurantId: number, score: number, comment?: string | null) {
  const userId = await getRequiredUserId();
  const { error } = await supabase.from("ratings").upsert(
    {
      user_id: userId,
      restaurant_id: restaurantId,
      score,
      comment: comment ?? null,
    },
    { onConflict: "user_id,restaurant_id" },
  );
  throwIfError(error, "评分失败");
  return { success: true };
}

export async function listMyRatings() {
  const userId = await getRequiredUserId();
  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("user_id", userId);
  throwIfError(error, "加载我的评分失败");
  return (data ?? []).map(toRating);
}

export async function listMyBlacklist() {
  const userId = await getRequiredUserId();
  const { data, error } = await supabase
    .from("blacklist")
    .select("*")
    .eq("user_id", userId);
  throwIfError(error, "加载黑名单失败");
  return (data ?? []).map(toBlacklistEntry);
}

export async function addToBlacklist(restaurantId: number) {
  const userId = await getRequiredUserId();
  const { error } = await supabase
    .from("blacklist")
    .upsert({ user_id: userId, restaurant_id: restaurantId }, { onConflict: "user_id,restaurant_id" });
  throwIfError(error, "加入黑名单失败");
  return { success: true };
}

export async function removeFromBlacklist(restaurantId: number) {
  const userId = await getRequiredUserId();
  const { error } = await supabase
    .from("blacklist")
    .delete()
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId);
  throwIfError(error, "移出黑名单失败");
  return { success: true };
}

export async function randomPick(useWeights: boolean) {
  return invokeFunction<PickResult[]>("random-pick", { useWeights });
}
