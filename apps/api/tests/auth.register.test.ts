import { describe, expect, it } from "vitest";
import argon2 from "argon2";
import { buildApp } from "../src/app.js";
import { type CreateUser } from "../src/modules/auth/auth.repository.js";

const valid = {
  email: "  USER@Example.COM ",
  password: "very-strong-password-123",
};

describe("POST /auth/register", () => {
  it("returns 201, normalizes email and hashes password", async () => {
    let receivedHash = "";
    const createUser: CreateUser = async (email, hash) => {
      expect(email).toBe("user@example.com");
      receivedHash = hash;
      return {
        id: "00000000-0000-4000-8000-000000000001",
        email,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      };
    };
    const app = buildApp({ createUser });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: valid,
      });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        id: "00000000-0000-4000-8000-000000000001",
        email: "user@example.com",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      expect(receivedHash).toMatch(/^\$argon2id\$/);
      expect(await argon2.verify(receivedHash, valid.password)).toBe(true);
      expect(response.body).not.toContain("password");
    } finally {
      await app.close();
    }
  });

  it.each([
    { email: "invalid", password: "very-strong-password-123" },
    { email: "user@example.com", password: "short" },
    {
      email: "user@example.com",
      password: "very-strong-password-123",
      extra: true,
    },
  ])("rejects invalid input", async (payload) => {
    const app = buildApp({
      createUser: async () => {
        throw new Error("Must not insert");
      },
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload,
      });
      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("limits repeated registration attempts without login dependencies", async () => {
    const createUser: CreateUser = async () => {
      throw new Error("Registration should not be attempted for invalid input");
    };
    const app = buildApp({ createUser });
    try {
      const responses = [];
      for (let i = 0; i < 6; i++) {
        responses.push(
          await app.inject({
            method: "POST",
            url: "/auth/register",
            payload: { email: "invalid", password: "short" },
          }),
        );
      }
      expect(
        responses.slice(0, 5).every((response) => response.statusCode === 400),
      ).toBe(true);
      expect(responses[5]?.statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });

  it("returns 409 on the database unique constraint", async () => {
    const app = buildApp({
      createUser: async () => {
        throw Object.assign(new Error("duplicate"), {
          code: "23505",
          constraint: "users_email_normalized_uq",
        });
      },
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: valid,
      });
      expect(response.statusCode).toBe(409);
    } finally {
      await app.close();
    }
  });

  it("does not expose unexpected database errors", async () => {
    const app = buildApp({
      createUser: async () => {
        throw new Error("private database detail");
      },
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: valid,
      });
      expect(response.statusCode).toBe(500);
      expect(response.body).not.toContain("private database detail");
    } finally {
      await app.close();
    }
  });
});
