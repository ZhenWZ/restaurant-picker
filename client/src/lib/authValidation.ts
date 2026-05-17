import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "用户名至少3个字符")
  .max(32, "用户名最多32个字符")
  .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名只能包含字母、数字、下划线和中文");

export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email("请输入有效邮箱"),
  password: z.string().min(6, "密码至少6个字符").max(64, "密码最多64个字符"),
  name: z.string().trim().min(1, "昵称不能为空").max(32, "昵称最多32个字符"),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

export function normalizeUsername(username: string) {
  return username.trim().toLocaleLowerCase();
}

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
