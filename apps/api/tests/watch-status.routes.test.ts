import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { hashSessionToken } from "../src/modules/auth/session.service.js";
import {
  TmdbNotFoundError,
  TmdbUnavailableError,
} from "../src/modules/catalog/tmdb.client.js";
import type { WatchStatusRepository } from "../src/modules/watch-status/watch-status.repository.js";

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
  const repository: WatchStatusRepository = {
    list: vi.fn(async () => [
      {
        id: 603,
        mediaType: "movie" as const,
        title: "Matrix",
        overview: "Sinopse",
        posterPath: "/poster.jpg",
        releaseDate: "1999-03-31",
        status: "WATCHING" as const,
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
    watchStatusRepository: repository,
    getCatalogDetails:
      options?.configured === false ? undefined : getCatalogDetails,
  });
  return { app, repository, getCatalogDetails };
}

describe("Watch status routes", () => {
  it("lists statuses belonging to the current user", async () => {
    const { app, repository } = setup();
    try {
      const response = await app.inject({
        method: "GET",
        url: "/watch-status",
        headers: { cookie },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().results[0].status).toBe("WATCHING");
      expect(repository.list).toHaveBeenCalledWith(userId);
    } finally {
      await app.close();
    }
  });
  it("requires authentication for all operations", async () => {
    const { app, repository } = setup({ session: false });
    try {
      for (const method of ["GET", "PUT", "DELETE"] as const) {
        const response = await app.inject({
          method,
          url: method === "GET" ? "/watch-status" : "/watch-status/movie/603",
          headers,
          ...(method === "PUT" ? { payload: { status: "WATCHING" } } : {}),
        });
        expect(response.statusCode).toBe(401);
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
        const response = await app.inject({
          method,
          url: "/watch-status/movie/603",
          headers: { ...headers, origin: "https://evil.example" },
          ...(method === "PUT" ? { payload: { status: "WATCHING" } } : {}),
        });
        expect(response.statusCode).toBe(403);
      }
      expect(repository.set).not.toHaveBeenCalled();
      expect(repository.remove).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
  it.each(["WANT_TO_WATCH", "WATCHING", "WATCHED"])(
    "saves %s",
    async (status) => {
      const { app, repository } = setup();
      try {
        const response = await app.inject({
          method: "PUT",
          url: "/watch-status/movie/603",
          headers,
          payload: { status },
        });
        expect(response.statusCode).toBe(204);
        expect(repository.set).toHaveBeenCalledWith(userId, details, status);
      } finally {
        await app.close();
      }
    },
  );
  it("rejects invalid media, id and status", async () => {
    const { app, repository } = setup();
    try {
      for (const [url, payload] of [
        ["/watch-status/person/603", { status: "WATCHING" }],
        ["/watch-status/movie/0", { status: "WATCHING" }],
        ["/watch-status/tv/abc", { status: "WATCHING" }],
        ["/watch-status/movie/603", { status: "INVALID" }],
        ["/watch-status/movie/603", {}],
      ] as const) {
        const response = await app.inject({
          method: "PUT",
          url,
          headers,
          payload,
        });
        expect(response.statusCode).toBe(400);
      }
      expect(repository.set).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
  it("handles a missing TMDB configuration", async () => {
    const { app } = setup({ configured: false });
    try {
      const response = await app.inject({
        method: "PUT",
        url: "/watch-status/movie/603",
        headers,
        payload: { status: "WATCHING" },
      });
      expect(response.statusCode).toBe(503);
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
      const response = await app.inject({
        method: "PUT",
        url: "/watch-status/movie/603",
        headers,
        payload: { status: "WATCHING" },
      });
      expect(response.statusCode).toBe(code);
      expect(repository.set).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
  it("removes a status", async () => {
    const { app, repository } = setup();
    try {
      const response = await app.inject({
        method: "DELETE",
        url: "/watch-status/tv/1399",
        headers,
      });
      expect(response.statusCode).toBe(204);
      expect(repository.remove).toHaveBeenCalledWith(userId, "tv", 1399);
    } finally {
      await app.close();
    }
  });
  it("rejects invalid delete parameters", async () => {
    const { app, repository } = setup();
    try {
      const response = await app.inject({
        method: "DELETE",
        url: "/watch-status/movie/0",
        headers,
      });
      expect(response.statusCode).toBe(400);
      expect(repository.remove).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
