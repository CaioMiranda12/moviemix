import argon2 from "argon2";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { hashSessionToken } from "../src/modules/auth/session.service.js";

const email = "user@example.com";
const password = "correct-password-123";

async function makeApp() {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const saved: Array<{ userId: string; tokenHash: string; expiresAt: Date }> =
    [];
  const app = buildApp({
    findUserByEmail: async (value) =>
      value === email
        ? {
            id: "00000000-0000-4000-8000-000000000001",
            email,
            passwordHash,
          }
        : null,
    createSession: async (input) => {
      saved.push(input);
    },
  });
  return { app, saved };
}

describe("POST /auth/login", () => {
  it("authenticates, saves a hashed session token and sends an HttpOnly cookie", async () => {
    const { app, saved } = await makeApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: " USER@EXAMPLE.COM ", password },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        user: { id: "00000000-0000-4000-8000-000000000001", email },
      });
      const cookie = response.headers["set-cookie"];
      expect(typeof cookie).toBe("string");
      const token = String(cookie).match(
        /^moviemix_session=([0-9a-f]{64});/,
      )?.[1];
      expect(token).toBeTruthy();
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Path=/");
      expect(saved).toHaveLength(1);
      expect(saved[0]?.tokenHash).toBe(hashSessionToken(token!));
      expect(saved[0]?.tokenHash).not.toBe(token);
      expect(saved[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(response.body).not.toContain(token!);
      expect(response.body).not.toContain("password");
    } finally {
      await app.close();
    }
  });

  it.each([
    { email, password: "wrong-password" },
    { email: "unknown@example.com", password },
  ])("returns the same 401 for invalid credentials", async (payload) => {
    const { app, saved } = await makeApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload,
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: "Invalid credentials" });
      expect(response.headers["set-cookie"]).toBeUndefined();
      expect(saved).toHaveLength(0);
    } finally {
      await app.close();
    }
  });

  it("rejects invalid bodies", async () => {
    const { app } = await makeApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "bad", password },
      });
      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("limits repeated attempts", async () => {
    const { app } = await makeApp();
    try {
      const responses = [];
      for (let i = 0; i < 6; i++) {
        responses.push(
          await app.inject({
            method: "POST",
            url: "/auth/login",
            payload: { email, password: "wrong" },
          }),
        );
      }
      expect(
        responses.slice(0, 5).every((response) => response.statusCode === 401),
      ).toBe(true);
      expect(responses[5]?.statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });

  it("does not expose session persistence errors", async () => {
    const passwordHash = await argon2.hash(password);
    const app = buildApp({
      findUserByEmail: async () => ({
        id: "00000000-0000-4000-8000-000000000001",
        email,
        passwordHash,
      }),
      createSession: async () => {
        throw new Error("private session DB failure");
      },
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password },
      });
      expect(response.statusCode).toBe(500);
      expect(response.body).not.toContain("private session DB failure");
      expect(response.headers["set-cookie"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});
