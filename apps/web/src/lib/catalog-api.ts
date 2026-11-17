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

type CatalogResponse = { results: CatalogItem[] };

async function getCatalog(path: string): Promise<CatalogItem[]> {
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
  search: (query: string, type: MediaType) => {
    const params = new URLSearchParams({ q: query, type });
    return getCatalog(`/search?${params.toString()}`);
  },
};
