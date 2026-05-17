import { errorResponse, jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { toProfile } from "../_shared/profile.ts";
import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";
import { normalizeUsername } from "../_shared/validation.ts";

type LoginPayload = {
  username?: unknown;
  password?: unknown;
};

Deno.serve(async req => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const payload = (await req.json()) as LoginPayload;
    if (typeof payload.username !== "string" || payload.username.trim().length === 0) {
      return errorResponse("请输入用户名", 400);
    }
    if (typeof payload.password !== "string" || payload.password.length === 0) {
      return errorResponse("请输入密码", 400);
    }

    const service = createServiceClient();
    const { data: profile, error: lookupError } = await service
      .from("profiles")
      .select("*")
      .eq("username_normalized", normalizeUsername(payload.username))
      .maybeSingle();

    if (lookupError) return errorResponse(lookupError.message, 500);
    if (!profile?.email) return errorResponse("用户名或密码错误", 401);

    const anon = createAnonClient();
    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email: profile.email,
      password: payload.password,
    });

    if (signInError || !signInData.session) {
      return errorResponse("用户名或密码错误", 401);
    }

    const { data: updatedProfile, error: updateError } = await service
      .from("profiles")
      .update({ last_signed_in: new Date().toISOString(), login_method: "password" })
      .eq("user_id", profile.user_id)
      .select("*")
      .single();
    if (updateError) return errorResponse(updateError.message, 500);

    return jsonResponse({
      session: signInData.session,
      profile: toProfile(updatedProfile),
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "登录失败", 500);
  }
});
