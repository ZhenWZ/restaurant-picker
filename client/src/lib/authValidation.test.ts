import { describe, expect, it } from "vitest";
import { normalizeUsername, registerSchema, usernameSchema } from "./authValidation";

describe("auth validation", () => {
  it("normalizes usernames for lookups", () => {
    expect(normalizeUsername("  Test_User  ")).toBe("test_user");
    expect(normalizeUsername("  张三  ")).toBe("张三");
  });

  it("accepts username, email, password, and name registration payloads", () => {
    const parsed = registerSchema.parse({
      username: "test_user",
      email: "test@example.com",
      password: "password123",
      name: "Tester",
    });

    expect(parsed.username).toBe("test_user");
    expect(parsed.email).toBe("test@example.com");
  });

  it("rejects unsupported username characters", () => {
    expect(() => usernameSchema.parse("bad-name")).toThrow();
    expect(() => usernameSchema.parse("ab")).toThrow();
  });
});
