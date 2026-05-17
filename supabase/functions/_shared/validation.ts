export function normalizeUsername(username: string) {
  return username.trim().toLocaleLowerCase();
}

export function validateUsername(username: unknown) {
  if (typeof username !== "string") return "用户名不能为空";
  const value = username.trim();
  if (value.length < 3) return "用户名至少3个字符";
  if (value.length > 32) return "用户名最多32个字符";
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(value)) {
    return "用户名只能包含字母、数字、下划线和中文";
  }
  return null;
}

export function cleanUsernameCandidate(value: string) {
  const normalized = normalizeUsername(value)
    .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.slice(0, 24) || "user";
}
