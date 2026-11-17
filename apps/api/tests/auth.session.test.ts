import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { hashSessionToken } from "../src/modules/auth/session.service.js";

const token = "a".repeat(64);
const cookie = `moviemix_session=${token}`;
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "user@example.com",
};

function setup(expires = false) {
  let revoked = false;
  const app = buildApp({
    findSessionUser: async (hash) =>
      hash === hashSessionToken(token) && !expires && !revoked ? user : null,
    revokeSession: async (hash) => {
      expect(hash).toBe(hashSessionToken(token));
      revoked = true;
    },
  });
  return app;
}

describe("Authenticated sessions", () => {
  it("returns current user without exposing credentials", async () => {
    const app = setup();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ user });
    } finally {
      await app.close();
    }
  });
  it("rejects missing, malformed, duplicated and expired sessions", async () => {
    const app = setup(true);
    try {
      for (const header of [
        undefined,
        "moviemix_session=bad",
        `${cookie}; ${cookie}`,
        cookie,
      ]) {
        const res = await app.inject({
          method: "GET",
          url: "/auth/me",
          headers: header ? { cookie: header } : {},
        });
        expect(res.statusCode).toBe(401);
      }
    } finally {
      await app.close();
    }
  });
  it("revokes the current session and clears the cookie", async () => {
    const app = setup();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: {
          cookie,
          origin: "http://localhost:80",
          host: "localhost:80",
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res.headers["set-cookie"]).toContain("Max-Age=0");
      const me = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { cookie },
      });
      expect(me.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
  it("rejects cross-origin and missing-Origin logout", async () => {
    const app = setup();
    try {
      for (const origin of [undefined, "https://evil.example"]) {
        const res = await app.inject({
          method: "POST",
          url: "/auth/logout",
          headers: {
            cookie,
            host: "localhost:80",
            ...(origin ? { origin } : {}),
          },
        });
        expect(res.statusCode).toBe(403);
      }
    } finally {
      await app.close();
    }
  });
});
