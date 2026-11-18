import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogApi } from "./catalog-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requisições simultâneas ao catálogo", () => {
  it("compartilha buscas idênticas enquanto estão pendentes", async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = catalogApi.search("matrix", "movie");
    const second = catalogApi.search("matrix", "movie");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch(
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    );
    await expect(Promise.all([first, second])).resolves.toEqual([[], []]);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    );
    await expect(catalogApi.search("matrix", "movie")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("não compartilha consultas de tipos diferentes", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ results: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await Promise.all([
      catalogApi.search("matrix", "movie"),
      catalogApi.search("matrix", "tv"),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("permite nova tentativa após erro", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [] }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(catalogApi.trending()).rejects.toThrow("network");
    await expect(catalogApi.trending()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
