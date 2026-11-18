import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import type { PlaylistsRepository } from "../src/modules/playlists/playlists.repository.js";
import {
  hashSessionToken,
  SESSION_COOKIE_NAME,
} from "../src/modules/auth/session.service.js";

const userId = "a46b7c9d-8a1e-4c11-bdaa-ff0022446688";
const playlistId = "2a4d3d8e-b891-4c4a-88b2-b0ac1fd020a1";
const token = "a".repeat(64);
const cookie = `${SESSION_COOKIE_NAME}=${token}`;
const origin = "http://localhost:80";
const item = {
  id: playlistId,
  name: "Cinema",
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setup() {
  const repository: PlaylistsRepository = {
    get: vi.fn(async () => item),
    items: vi.fn(async () => []),
    addItem: vi.fn(async () => "added" as const),
    removeItem: vi.fn(async () => "removed" as const),
    reorderItems: vi.fn(async () => "updated" as const),
    list: vi.fn(async () => [item]),
    create: vi.fn(async (_user, name) => ({ ...item, name })),
    rename: vi.fn(async (_user, _id, name) => ({ ...item, name })),
    remove: vi.fn(async () => true),
  };
  const app = buildApp({
    findSessionUser: async (hash) =>
      hash === hashSessionToken(token)
        ? { id: userId, email: "user@example.com" }
        : null,
    playlistsRepository: repository,
    getCatalogDetails: async (mediaType, id) => ({
      id,
      mediaType,
      title: "Teste",
      overview: "",
      posterPath: null,
      backdropPath: null,
      releaseDate: "",
      voteAverage: 8,
      genres: [],
    }),
  });
  return { app, repository };
}

describe("Personal playlists", () => {
  it("requires authentication", async () => {
    const { app } = setup();
    expect(
      (await app.inject({ method: "GET", url: "/playlists" })).statusCode,
    ).toBe(401);
    await app.close();
  });
  it("lists only for the session user", async () => {
    const { app, repository } = setup();
    const response = await app.inject({
      method: "GET",
      url: "/playlists",
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    expect(repository.list).toHaveBeenCalledWith(userId);
    await app.close();
  });
  it("rejects cross-origin changes", async () => {
    const { app, repository } = setup();
    const response = await app.inject({
      method: "POST",
      url: "/playlists",
      headers: { cookie, origin: "https://evil.example" },
      payload: { name: "Cinema" },
    });
    expect(response.statusCode).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
    await app.close();
  });
  it("validates names and trims whitespace", async () => {
    const { app, repository } = setup();
    const headers = { cookie, origin };
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/playlists",
          headers,
          payload: { name: "   " },
        })
      ).statusCode,
    ).toBe(400);
    const response = await app.inject({
      method: "POST",
      url: "/playlists",
      headers,
      payload: { name: "  Cinema  " },
    });
    expect(response.statusCode).toBe(201);
    expect(repository.create).toHaveBeenCalledWith(userId, "Cinema");
    await app.close();
  });
  it("renames and deletes scoped to the session user", async () => {
    const { app, repository } = setup();
    const headers = { cookie, origin };
    const renamed = await app.inject({
      method: "PATCH",
      url: `/playlists/${playlistId}`,
      headers,
      payload: { name: "Favoritos" },
    });
    expect(renamed.statusCode).toBe(200);
    expect(repository.rename).toHaveBeenCalledWith(
      userId,
      playlistId,
      "Favoritos",
    );
    const deleted = await app.inject({
      method: "DELETE",
      url: `/playlists/${playlistId}`,
      headers,
    });
    expect(deleted.statusCode).toBe(204);
    expect(repository.remove).toHaveBeenCalledWith(userId, playlistId);
    await app.close();
  });
  it("returns 404 for lists not owned by the user", async () => {
    const { app, repository } = setup();
    vi.mocked(repository.rename).mockResolvedValueOnce(null);
    vi.mocked(repository.remove).mockResolvedValueOnce(false);
    const headers = { cookie, origin };
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: `/playlists/${playlistId}`,
          headers,
          payload: { name: "Outra" },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/playlists/${playlistId}`,
          headers,
        })
      ).statusCode,
    ).toBe(404);
    await app.close();
  });
});

describe("Playlist items", () => {
  it("requires authentication to open a playlist", async () => {
    const { app } = setup();
    const response = await app.inject({
      method: "GET",
      url: `/playlists/${playlistId}`,
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });
  it("opens a list scoped to the signed-in user", async () => {
    const { app, repository } = setup();
    const response = await app.inject({
      method: "GET",
      url: `/playlists/${playlistId}`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    expect(repository.get).toHaveBeenCalledWith(userId, playlistId);
    expect(repository.items).toHaveBeenCalledWith(userId, playlistId);
    await app.close();
  });
  it("rejects cross-origin additions", async () => {
    const { app, repository } = setup();
    const response = await app.inject({
      method: "POST",
      url: `/playlists/${playlistId}/items`,
      headers: { cookie, origin: "https://evil.example" },
      payload: { mediaType: "movie", id: 123 },
    });
    expect(response.statusCode).toBe(403);
    expect(repository.addItem).not.toHaveBeenCalled();
    await app.close();
  });
  it("adds a verified title and rejects duplicates", async () => {
    const { app, repository } = setup();
    const headers = { cookie, origin };
    const url = `/playlists/${playlistId}/items`;
    const response = await app.inject({
      method: "POST",
      url,
      headers,
      payload: { mediaType: "movie", id: 123 },
    });
    expect(response.statusCode).toBe(201);
    expect(repository.addItem).toHaveBeenCalledWith(
      userId,
      playlistId,
      expect.objectContaining({ id: 123, title: "Teste" }),
    );
    vi.mocked(repository.addItem).mockResolvedValueOnce("duplicate");
    const duplicate = await app.inject({
      method: "POST",
      url,
      headers,
      payload: { mediaType: "movie", id: 123 },
    });
    expect(duplicate.statusCode).toBe(409);
    await app.close();
  });
  it("removes a title scoped to its owner", async () => {
    const { app, repository } = setup();
    const response = await app.inject({
      method: "DELETE",
      url: `/playlists/${playlistId}/items/tv/456`,
      headers: { cookie, origin },
    });
    expect(response.statusCode).toBe(204);
    expect(repository.removeItem).toHaveBeenCalledWith(
      userId,
      playlistId,
      "tv",
      456,
    );
    await app.close();
  });
});

describe("Playlist manual ordering", () => {
  const url = `/playlists/${playlistId}/items/order`;
  const valid = {
    items: [
      { mediaType: "movie", id: 123 },
      { mediaType: "tv", id: 456 },
    ],
  };

  it("requires authentication", async () => {
    const { app } = setup();
    expect(
      (
        await app.inject({
          method: "PUT",
          url,
          headers: { origin },
          payload: valid,
        })
      ).statusCode,
    ).toBe(401);
    await app.close();
  });

  it("rejects cross-origin writes", async () => {
    const { app, repository } = setup();
    const response = await app.inject({
      method: "PUT",
      url,
      headers: { cookie, origin: "https://evil.example" },
      payload: valid,
    });
    expect(response.statusCode).toBe(403);
    expect(repository.reorderItems).not.toHaveBeenCalled();
    await app.close();
  });

  it("validates the payload", async () => {
    const { app, repository } = setup();
    const response = await app.inject({
      method: "PUT",
      url,
      headers: { cookie, origin },
      payload: { items: [{ mediaType: "movie", id: -1 }] },
    });
    expect(response.statusCode).toBe(400);
    expect(repository.reorderItems).not.toHaveBeenCalled();
    await app.close();
  });

  it("saves the order for the authenticated user", async () => {
    const { app, repository } = setup();
    const response = await app.inject({
      method: "PUT",
      url,
      headers: { cookie, origin },
      payload: valid,
    });
    expect(response.statusCode).toBe(204);
    expect(repository.reorderItems).toHaveBeenCalledWith(
      userId,
      playlistId,
      valid.items,
    );
    await app.close();
  });

  it("rejects stale ordering and unknown playlists", async () => {
    const { app, repository } = setup();
    vi.mocked(repository.reorderItems)
      .mockResolvedValueOnce("mismatch")
      .mockResolvedValueOnce("missing");
    const headers = { cookie, origin };
    expect(
      (await app.inject({ method: "PUT", url, headers, payload: valid }))
        .statusCode,
    ).toBe(409);
    expect(
      (await app.inject({ method: "PUT", url, headers, payload: valid }))
        .statusCode,
    ).toBe(404);
    await app.close();
  });
});
