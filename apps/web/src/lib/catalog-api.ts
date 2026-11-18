export type MediaType = "movie" | "tv";

export type CatalogItem = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  mediaType?: MediaType;
};

export type CatalogPage = {
  results: CatalogItem[];
  page: number;
  hasMore: boolean;
};
type CatalogResponse = { results: CatalogItem[] };
const pendingPages = new Map<string, Promise<CatalogPage>>();

function getPage(path: string): Promise<CatalogPage> {
  const existing = pendingPages.get(path);
  if (existing) return existing;
  const request = fetch(`/api/catalog${path}`, {
    credentials: "same-origin",
  }).then(async (response) => {
    if (!response.ok) throw new Error("Não foi possível carregar o catálogo.");
    const data = (await response.json()) as CatalogPage;
    if (
      !Array.isArray(data.results) ||
      typeof data.hasMore !== "boolean" ||
      !Number.isInteger(data.page)
    )
      throw new Error("Resposta inválida do catálogo.");
    return data;
  });
  pendingPages.set(path, request);
  void request
    .finally(() => {
      if (pendingPages.get(path) === request) pendingPages.delete(path);
    })
    .catch(() => {});
  return request;
}

// Share identical in-flight public catalog requests. No response is cached after settlement.
const pendingCatalog = new Map<string, Promise<CatalogItem[]>>();

function getCatalog(path: string): Promise<CatalogItem[]> {
  const existing = pendingCatalog.get(path);
  if (existing) return existing;

  const request = fetchCatalog(path);
  pendingCatalog.set(path, request);
  void request
    .finally(() => {
      if (pendingCatalog.get(path) === request) pendingCatalog.delete(path);
    })
    .catch(() => {});
  return request;
}

async function fetchCatalog(path: string): Promise<CatalogItem[]> {
  const response = await fetch(`/api/catalog${path}`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar o catálogo.");
  }

  const data = (await response.json()) as CatalogResponse;
  if (!Array.isArray(data.results)) {
    throw new Error("Resposta inválida do catálogo.");
  }
  return data.results;
}

export const catalogApi = {
  trending: () => getCatalog("/trending"),
  filterPage: (
    filters: {
      type: MediaType;
      query?: string;
      genre?: number;
      year?: number;
      minRating?: number;
    },
    page: number,
  ): Promise<CatalogPage> => {
    const params = new URLSearchParams({
      type: filters.type,
      page: String(page),
    });
    if (filters.query) params.set("q", filters.query);
    if (filters.genre !== undefined) params.set("genre", String(filters.genre));
    if (filters.year !== undefined) params.set("year", String(filters.year));
    if (filters.minRating !== undefined)
      params.set("minRating", String(filters.minRating));
    return getPage(`/filter-page?${params}`);
  },
  filter: (filters: {
    type: MediaType;
    query?: string;
    genre?: number;
    year?: number;
    minRating?: number;
  }) => {
    const params = new URLSearchParams({ type: filters.type });
    if (filters.query) params.set("q", filters.query);
    if (filters.genre !== undefined) params.set("genre", String(filters.genre));
    if (filters.year !== undefined) params.set("year", String(filters.year));
    if (filters.minRating !== undefined)
      params.set("minRating", String(filters.minRating));
    return getCatalog(`/filter?${params}`);
  },
  discover: (type: MediaType, genreId: number) =>
    getCatalog(
      `/discover?${new URLSearchParams({ type, genre: String(genreId) })}`,
    ),
  search: (query: string, type: MediaType) => {
    const params = new URLSearchParams({ q: query, type });
    return getCatalog(`/search?${params.toString()}`);
  },
};

export type CatalogDetails = CatalogItem & {
  mediaType: MediaType;
  backdropPath: string | null;
  genres: { id: number; name: string }[];
};

export async function getCatalogDetails(
  mediaType: MediaType,
  id: string,
): Promise<CatalogDetails> {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    throw new Error("Identificador inválido.");
  }
  const response = await fetch(`/api/catalog/${mediaType}/${id}`, {
    credentials: "same-origin",
  });
  if (response.status === 404) throw new Error("Título não encontrado.");
  if (!response.ok) throw new Error("Não foi possível carregar os detalhes.");
  const data = (await response.json()) as { result?: CatalogDetails };
  if (!data.result || data.result.id !== Number(id)) {
    throw new Error("Resposta inválida do catálogo.");
  }
  return data.result;
}
