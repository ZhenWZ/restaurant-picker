import { errorResponse, jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";

type PickPayload = {
  useWeights?: boolean;
};

type RestaurantRow = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  emoji: string | null;
};

type WeightedRestaurant = RestaurantRow & {
  weight: number;
};

function weightedRandom(items: WeightedRestaurant[]) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const payload = (await req.json().catch(() => ({}))) as PickPayload;
    const service = createServiceClient();
    const authorization = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authorization) {
      const authed = createAnonClient(authorization);
      const { data } = await authed.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const { data: restaurants, error: restaurantError } = await service
      .from("restaurants")
      .select("id,name,description,category,emoji")
      .order("created_at", { ascending: true });
    if (restaurantError) return errorResponse(restaurantError.message, 500);

    let blacklistedIds = new Set<number>();
    if (userId) {
      const { data: blacklist, error: blacklistError } = await service
        .from("blacklist")
        .select("restaurant_id")
        .eq("user_id", userId);
      if (blacklistError) return errorResponse(blacklistError.message, 500);
      blacklistedIds = new Set((blacklist ?? []).map(item => Number(item.restaurant_id)));
    }

    const available = (restaurants ?? []).filter(item => !blacklistedIds.has(Number(item.id)));
    if (available.length === 0) {
      return errorResponse("没有可用的餐厅，请先添加餐厅或调整黑名单", 400);
    }

    let ratingWeights = new Map<number, number>();
    if (payload.useWeights) {
      const { data: stats, error: statsError } = await service.rpc("get_restaurant_rating_stats");
      if (statsError) return errorResponse(statsError.message, 500);
      ratingWeights = new Map(
        (stats ?? []).map(item => [
          Number(item.restaurant_id),
          item.average ? Number(item.average) : 3,
        ]),
      );
    }

    const weighted = available.map(item => ({
      ...item,
      id: Number(item.id),
      weight: payload.useWeights ? ratingWeights.get(Number(item.id)) ?? 3 : 1,
    }));

    const picks = [
      weightedRandom(weighted),
      weightedRandom(weighted),
      weightedRandom(weighted),
    ].map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      emoji: item.emoji,
    }));

    return jsonResponse(picks);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "抽取失败", 500);
  }
});
