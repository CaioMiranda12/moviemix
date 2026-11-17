import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { hashSessionToken } from "../src/modules/auth/session.service.js";
import {
  TmdbNotFoundError,
  TmdbUnavailableError,
} from "../src/modules/catalog/tmdb.client.js";
import type { RatingsRepository } from "../src/modules/ratings/ratings.repository.js";

const token = "a".repeat(64);
const cookie = `moviemix_session=${token}`;
const userId = "00000000-0000-4000-8000-000000000001";
const headers = { cookie, origin: "http://localhost:80", host: "localhost:80" };
const details = {
  id: 603,
  mediaType: "movie" as const,
  title: "Matrix",
  overview: "Sinopse",
  posterPath: "/poster.jpg",
  backdropPath: null,
  releaseDate: "1999-03-31",
  voteAverage: 8.2,
  genres: [],
};
function setup(options?: {
  session?: boolean;
  provider?: "not-found" | "offline";
  configured?: boolean;
}) {
  const repository: RatingsRepository = {
    list: vi.fn(async () => [
      {
        id: 603,
        mediaType: "movie" as const,
        title: "Matrix",
        overview: "Sinopse",
        posterPath: "/poster.jpg",
        releaseDate: "1999-03-31",
        score: 4,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]),
    set: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
  };
  const getCatalogDetails = vi.fn(async () => {
    if (options?.provider === "not-found") throw new TmdbNotFoundError();
    if (options?.provider === "offline") throw new TmdbUnavailableError();
    return details;
  });
  const app = buildApp({
    findSessionUser: async (hash) =>
      options?.session === false
        ? null
        : hash === hashSessionToken(token)
          ? { id: userId, email: "user@example.com" }
          : null,
    ratingsRepository: repository,
    getCatalogDetails:
      options?.configured === false ? undefined : getCatalogDetails,
  });
  return { app, repository, getCatalogDetails };
}

describe("Ratings routes", () => {
  it("lists the current user's ratings", async () => {
    const { app, repository } = setup();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/ratings",
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().results[0].score).toBe(4);
      expect(repository.list).toHaveBeenCalledWith(userId);
    } finally {
      await app.close();
    }
  });
  it("requires authentication for every operation", async () => {
    const { app, repository } = setup({ session: false });
    try {
      for (const method of ["GET", "PUT", "DELETE"] as const) {
        const res = await app.inject({
          method,
          url: method === "GET" ? "/ratings" : "/ratings/movie/603",
          headers,
          ...(method === "PUT" ? { payload: { score: 4 } } : {}),
        });
        expect(res.statusCode).toBe(401);
      }
      expect(repository.list).not.toHaveBeenCalled();
      expect(repository.set).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
  it("rejects cross-origin writes", async () => {
    const { app, repository } = setup();
    try {
      for (const method of ["PUT", "DELETE"] as const) {
        const res = await app.inject({
          method,
          url: "/ratings/movie/603",
          headers: { ...headers, origin: "https://evil.example" },
          ...(method === "PUT" ? { payload: { score: 4 } } : {}),
        });
        expect(res.statusCode).toBe(403);
      }
      expect(repository.set).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
  it.each([1, 2, 3, 4, 5])("accepts score %i", async (score) => {
    const { app, repository } = setup();
    try {
      const res = await app.inject({
        method: "PUT",
        url: "/ratings/movie/603",
        headers,
        payload: { score },
      });
      expect(res.statusCode).toBe(204);
      expect(repository.set).toHaveBeenCalledWith(userId, details, score);
    } finally {
      await app.close();
    }
  });
  it.each([0, 6, 3.5, "4", null, -1])(
    "rejects invalid score %s",
    async (score) => {
      const { app, repository } = setup();
      try {
        const res = await app.inject({
          method: "PUT",
          url: "/ratings/movie/603",
          headers,
          payload: { score },
        });
        expect(res.statusCode).toBe(400);
        expect(repository.set).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    },
  );
  it.each([
    "other/603",
    "movie/0",
    "movie/-1",
    "tv/abc",
    "movie/9007199254740992",
  ])("rejects invalid identity %s", async (identity) => {
    const { app, repository } = setup();
    try {
      for (const method of ["PUT", "DELETE"] as const) {
        const res = await app.inject({
          method,
          url: `/ratings/${identity}`,
          headers,
          ...(method === "PUT" ? { payload: { score: 4 } } : {}),
        });
        expect(res.statusCode).toBe(400);
      }
      expect(repository.set).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
  it("deletes a rating", async () => {
    const { app, repository } = setup();
    try {
      const res = await app.inject({
        method: "DELETE",
        url: "/ratings/tv/1399",
        headers,
      });
      expect(res.statusCode).toBe(204);
      expect(repository.remove).toHaveBeenCalledWith(userId, "tv", 1399);
    } finally {
      await app.close();
    }
  });
  it("reports unconfigured TMDB", async () => {
    const { app } = setup({ configured: false });
    try {
      const res = await app.inject({
        method: "PUT",
        url: "/ratings/movie/603",
        headers,
        payload: { score: 4 },
      });
      expect(res.statusCode).toBe(503);
    } finally {
      await app.close();
    }
  });
  it.each([
    ["not-found", 404],
    ["offline", 502],
  ] as const)("handles TMDB %s", async (provider, code) => {
    const { app, repository } = setup({ provider });
    try {
      const res = await app.inject({
        method: "PUT",
        url: "/ratings/movie/603",
        headers,
        payload: { score: 4 },
      });
      expect(res.statusCode).toBe(code);
      expect(repository.set).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
