import { errorResponse, jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { toProfile } from "../_shared/profile.ts";
import { createAnonClient, createServiceClient } from "../_shared/supabase.ts";
import { normalizeUsername, validateUsername } from "../_shared/validation.ts";

type RegisterPayload = {
  username?: unknown;
  email?: unknown;
  password?: unknown;
  name?: unknown;
};

Deno.serve(async req => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  try {
    const payload = (await req.json()) as RegisterPayload;
    const usernameError = validateUsername(payload.username);
    if (usernameError) return errorResponse(usernameError, 400);

    if (typeof payload.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
      return errorResponse("请输入有效邮箱", 400);
    }
    if (typeof payload.password !== "string" || payload.password.length < 6 || payload.password.length > 64) {
      return errorResponse("密码长度必须在6到64个字符之间", 400);
    }
    if (typeof payload.name !== "string" || payload.name.trim().length === 0 || payload.name.trim().length > 32) {
      return errorResponse("昵称不能为空且最多32个字符", 400);
    }

    const username = (payload.username as string).trim();
    const usernameNormalized = normalizeUsername(username);
    const email = payload.email.trim().toLocaleLowerCase();
    const name = payload.name.trim();
    const service = createServiceClient();

    const { data: usernameMatch, error: usernameLookupError } = await service
      .from("profiles")
      .select("user_id")
      .eq("username_normalized", usernameNormalized)
      .maybeSingle();
    if (usernameLookupError) return errorResponse(usernameLookupError.message, 500);
    if (usernameMatch) return errorResponse("该用户名已被注册", 409);

    const { data: emailMatch, error: emailLookupError } = await service
      .from("profiles")
      .select("user_id")
      .ilike("email", email)
      .maybeSingle();
    if (emailLookupError) return errorResponse(emailLookupError.message, 500);
    if (emailMatch) return errorResponse("该邮箱已被注册", 409);

    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        name,
        username,
      },
    });
    if (createError || !created.user) {
      return errorResponse(createError?.message ?? "注册失败", 400);
    }

    const { data: profileRow, error: profileError } = await service
      .from("profiles")
      .insert({
        user_id: created.user.id,
        username,
        email,
        name,
        login_method: "password",
        last_signed_in: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (profileError) {
      await service.auth.admin.deleteUser(created.user.id);
      return errorResponse(profileError.message, 500);
    }

    const anon = createAnonClient();
    const { data: sessionData, error: signInError } = await anon.auth.signInWithPassword({
      email,
      password: payload.password,
    });
    if (signInError || !sessionData.session) {
      return errorResponse(signInError?.message ?? "注册成功但登录失败", 500);
    }

    return jsonResponse({
      session: sessionData.session,
      profile: toProfile(profileRow),
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "注册失败", 500);
  }
});
