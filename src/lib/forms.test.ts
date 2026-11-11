import { describe, expect, it } from "vitest";

import { signInFormSchema, signUpFormSchema } from "./forms";

describe("auth form validation", () => {
  it("accepts a valid sign-in payload", () => {
    const parsed = signInFormSchema.parse({
      email: "user@example.com",
      password: "Password123"
    });

    expect(parsed.email).toBe("user@example.com");
  });

  it("rejects weak sign-up passwords", () => {
    expect(() =>
      signUpFormSchema.parse({
        email: "user@example.com",
        name: "Ada",
        password: "weakpass"
      })
    ).toThrow();
  });
});
