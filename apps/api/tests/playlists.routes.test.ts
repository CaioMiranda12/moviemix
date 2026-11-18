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
