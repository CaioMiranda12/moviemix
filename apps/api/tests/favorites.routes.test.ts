import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import type { FavoritesRepository } from "../src/modules/favorites/favorites.repository.js";
import { hashSessionToken } from "../src/modules/auth/session.service.js";
import {
  TmdbNotFoundError,
  TmdbUnavailableError,
} from "../src/modules/catalog/tmdb.client.js";

const token = "a".repeat(64);
const cookie = `moviemix_session=${token}`;
const userId = "00000000-0000-4000-8000-000000000001";
const originHeaders = {
  cookie,
  origin: "http://localhost:80",
  host: "localhost:80",
};
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
}) {
  const repository: FavoritesRepository = {
    list: vi.fn(async () => [
      {
        id: 603,
        mediaType: "movie" as const,
        title: "Matrix",
        overview: "Sinopse",
        posterPath: "/poster.jpg",
        releaseDate: "1999-03-31",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]),
    add: vi.fn(async () => {}),
    remove: vi.fn(async () => true),
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
    favoritesRepository: repository,
    getCatalogDetails,
  });
  return { app, repository, getCatalogDetails };
}

describe("Authenticated favorites endpoints", () => {
  it("lists only the authenticated user's favorites", async () => {
    const { app, repository } = setup();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/favorites",
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().results[0].title).toBe("Matrix");
      expect(repository.list).toHaveBeenCalledWith(userId);
    } finally {
      await app.close();
    }
  });

  it("rejects unauthenticated requests", async () => {
    const { app, repository } = setup({ session: false });
    try {
      for (const method of ["GET", "POST", "DELETE"] as const) {
        const res = await app.inject({
          method,
          url: method === "DELETE" ? "/favorites/movie/603" : "/favorites",
          headers: originHeaders,
          ...(method === "POST"
            ? { payload: { mediaType: "movie", id: 603 } }
            : {}),
        });
        expect(res.statusCode).toBe(401);
      }
      expect(repository.list).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("requires same-origin for mutations", async () => {
    const { app, repository } = setup();
    try {
      for (const method of ["POST", "DELETE"] as const) {
        const res = await app.inject({
          method,
          url: method === "POST" ? "/favorites" : "/favorites/movie/603",
          headers: {
            cookie,
            host: "localhost:80",
            origin: "https://evil.example",
          },
          ...(method === "POST"
            ? { payload: { mediaType: "movie", id: 603 } }
            : {}),
        });
        expect(res.statusCode).toBe(403);
      }
      expect(repository.add).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("adds validated TMDB media to the user's list", async () => {
    const { app, repository, getCatalogDetails } = setup();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/favorites",
        headers: originHeaders,
        payload: { mediaType: "movie", id: 603 },
      });
      expect(res.statusCode).toBe(204);
      expect(getCatalogDetails).toHaveBeenCalledWith("movie", 603);
      expect(repository.add).toHaveBeenCalledWith(userId, details);
    } finally {
      await app.close();
    }
  });

  it("rejects malformed payloads and IDs", async () => {
    const { app, repository } = setup();
    try {
      for (const payload of [
        { mediaType: "tv", id: 0 },
        { mediaType: "person", id: 603 },
        { mediaType: "movie", id: "603" },
        {},
      ]) {
        const res = await app.inject({
          method: "POST",
          url: "/favorites",
          headers: originHeaders,
          payload,
        });
        expect(res.statusCode).toBe(400);
      }
      const res = await app.inject({
        method: "DELETE",
        url: "/favorites/movie/abc",
        headers: originHeaders,
      });
      expect(res.statusCode).toBe(400);
      expect(repository.add).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("returns 404 or 502 for TMDB failures", async () => {
    for (const [provider, expected] of [
      ["not-found", 404],
      ["offline", 502],
    ] as const) {
      const { app, repository } = setup({ provider });
      try {
        const res = await app.inject({
          method: "POST",
          url: "/favorites",
          headers: originHeaders,
          payload: { mediaType: "movie", id: 603 },
        });
        expect(res.statusCode).toBe(expected);
        expect(repository.add).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    }
  });

  it("removes a favorite idempotently without consulting TMDB", async () => {
    const { app, repository, getCatalogDetails } = setup();
    try {
      const res = await app.inject({
        method: "DELETE",
        url: "/favorites/tv/1399",
        headers: originHeaders,
      });
      expect(res.statusCode).toBe(204);
      expect(repository.remove).toHaveBeenCalledWith(userId, "tv", 1399);
      expect(getCatalogDetails).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
