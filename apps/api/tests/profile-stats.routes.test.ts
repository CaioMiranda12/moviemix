import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { hashSessionToken } from "../src/modules/auth/session.service.js";
import type { ProfileStatsRepository } from "../src/modules/profile/profile-stats.repository.js";

const token = "a".repeat(64);
const userId = "00000000-0000-4000-8000-000000000001";
const stats = {
  favorites: 4,
  wantToWatch: 2,
  watching: 1,
  watched: 3,
  ratings: 2,
  averageRating: 4.5,
};

function setup(options?: { authenticated?: boolean; fails?: boolean }) {
  const repository: ProfileStatsRepository = {
    get: vi.fn(async () => {
      if (options?.fails) throw new Error("database offline");
      return stats;
    }),
  };
  const app = buildApp({
    findSessionUser: async (hash) =>
      options?.authenticated === false || hash !== hashSessionToken(token)
        ? null
        : { id: userId, email: "user@example.com" },
    profileStatsRepository: repository,
  });
  return { app, repository };
}

describe("GET /profile/stats", () => {
  it("returns statistics for the authenticated user", async () => {
    const { app, repository } = setup();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/profile/stats",
        headers: { cookie: `moviemix_session=${token}` },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(stats);
      expect(repository.get).toHaveBeenCalledTimes(1);
      expect(repository.get).toHaveBeenCalledWith(userId);
    } finally {
      await app.close();
    }
  });

  it("requires a valid session", async () => {
    const { app, repository } = setup({ authenticated: false });
    try {
      for (const cookie of [
        undefined,
        "moviemix_session=invalid",
        `moviemix_session=${token}`,
      ]) {
        const response = await app.inject({
          method: "GET",
          url: "/profile/stats",
          headers: cookie ? { cookie } : {},
        });
        expect(response.statusCode).toBe(401);
      }
      expect(repository.get).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("does not expose database errors", async () => {
    const { app } = setup({ fails: true });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/profile/stats",
        headers: { cookie: `moviemix_session=${token}` },
      });
      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({ error: "Internal server error" });
    } finally {
      await app.close();
    }
  });

  it("does not register the route without required dependencies", async () => {
    const app = buildApp();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/profile/stats",
      });
      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
