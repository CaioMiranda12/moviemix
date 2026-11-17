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
