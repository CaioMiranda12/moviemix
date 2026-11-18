import { describe, expect, it, vi } from "vitest";
import { makePlaylistsRepository } from "../src/modules/playlists/playlists.repository.js";

type Database = Parameters<typeof makePlaylistsRepository>[0];

function setup(rows: unknown[]) {
  const orderBy = vi.fn(async () => rows);
  const where = vi.fn(() => ({ orderBy }));
  const leftJoin = vi.fn(() => ({ leftJoin, where }));
  const from = vi.fn(() => ({ leftJoin }));
  const select = vi.fn(() => ({ from }));
  const repository = makePlaylistsRepository({ select } as unknown as Database);
  return { repository, select, leftJoin, where, orderBy };
}

describe("public playlist items repository", () => {
  it("returns null when no public playlist is visible", async () => {
    const { repository, select, leftJoin, where } = setup([]);
    expect(await repository.publicItems("hidden-playlist")).toBeNull();
    expect(select).toHaveBeenCalledTimes(1);
    expect(leftJoin).toHaveBeenCalledTimes(2);
    expect(where).toHaveBeenCalledTimes(1);
  });

  it("returns an empty array for a public playlist with no items", async () => {
    const { repository, select } = setup([
      {
        playlistId: "public-playlist",
        id: null,
        mediaType: null,
        title: null,
        overview: null,
        posterPath: null,
        releaseDate: null,
        addedAt: null,
      },
    ]);
    expect(await repository.publicItems("public-playlist")).toEqual([]);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("maps public playlist items in one query", async () => {
    const addedAt = new Date("2026-01-02T03:04:05Z");
    const { repository, select } = setup([
      {
        playlistId: "public-playlist",
        id: 42,
        mediaType: "MOVIE",
        title: "Example",
        overview: null,
        posterPath: "/poster.jpg",
        releaseDate: null,
        addedAt,
      },
    ]);
    expect(await repository.publicItems("public-playlist")).toEqual([
      {
        id: 42,
        mediaType: "movie",
        title: "Example",
        overview: "",
        posterPath: "/poster.jpg",
        releaseDate: "",
        addedAt: addedAt.toISOString(),
      },
    ]);
    expect(select).toHaveBeenCalledTimes(1);
  });
});
