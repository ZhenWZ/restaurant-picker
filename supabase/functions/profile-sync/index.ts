import { errorResponse, jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { toProfile } from "../_shared/profile.ts";
import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";
import { cleanUsernameCandidate } from "../_shared/validation.ts";

async function uniqueUsername(service: ReturnType<typeof createServiceClient>, candidate: string) {
  const base = cleanUsernameCandidate(candidate);
  for (let index = 0; index < 20; index += 1) {
    const username = index === 0 ? base : `${base}_${index + 1}`;
    const { data, error } = await service
      .from("profiles")
      .select("user_id")
      .eq("username_normalized", username.toLocaleLowerCase())
      .maybeSingle();
    if (error) throw error;
    if (!data) return username;
  }
  return `${base}_${crypto.randomUUID().slice(0, 8)}`;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return errorResponse("Missing authorization", 401);

    const authed = createAnonClient(authorization);
    const service = createServiceClient();
    const { data: userData, error: userError } = await authed.auth.getUser();
    if (userError || !userData.user) return errorResponse("Invalid session", 401);

    const user = userData.user;
    const { data: existing, error: existingError } = await service
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingError) return errorResponse(existingError.message, 500);

    const metadata = user.user_metadata ?? {};
    const email = user.email ?? null;
    const displayName =
      (typeof metadata.name === "string" && metadata.name) ||
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (typeof metadata.user_name === "string" && metadata.user_name) ||
      email?.split("@")[0] ||
      "用户";
    const loginMethod = (user.app_metadata?.provider as string | undefined) ?? "oauth";

    if (existing) {
      const { data: updated, error: updateError } = await service
        .from("profiles")
        .update({
          email,
          name: existing.name || displayName,
          login_method: loginMethod,
          last_signed_in: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (updateError) return errorResponse(updateError.message, 500);
      return jsonResponse(toProfile(updated));
    }

    const usernameCandidate =
      (typeof metadata.user_name === "string" && metadata.user_name) ||
      (typeof metadata.preferred_username === "string" && metadata.preferred_username) ||
      email?.split("@")[0] ||
      user.id.slice(0, 8);
    const username = await uniqueUsername(service, usernameCandidate);

    const { data: created, error: insertError } = await service
      .from("profiles")
      .insert({
        user_id: user.id,
        username,
        email,
        name: displayName,
        login_method: loginMethod,
        last_signed_in: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (insertError) return errorResponse(insertError.message, 500);

    return jsonResponse(toProfile(created));
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "同步用户资料失败", 500);
  }
});
