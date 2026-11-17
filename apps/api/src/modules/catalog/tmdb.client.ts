export interface TrendingMovie {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
}

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
}

interface TmdbTrendingResponse {
  results: TmdbMovie[];
}

export class TmdbUnavailableError extends Error {
  constructor() {
    super("TMDB temporarily unavailable");
    this.name = "TmdbUnavailableError";
  }
}

export type GetTrendingMovies = () => Promise<TrendingMovie[]>;

export function makeGetTrendingMovies(
  token: string,
  fetcher: typeof fetch = fetch,
): GetTrendingMovies {
  return async () => {
    let response: Response;
    try {
      response = await fetcher(
        "https://api.themoviedb.org/3/trending/movie/week?language=pt-BR",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(5000),
        },
      );
    } catch {
      throw new TmdbUnavailableError();
    }

    if (!response.ok) throw new TmdbUnavailableError();

    try {
      const payload = (await response.json()) as TmdbTrendingResponse;
      if (!Array.isArray(payload.results))
        throw new Error("Invalid TMDB response");
      return payload.results.map((movie) => ({
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        posterPath: movie.poster_path,
        releaseDate: movie.release_date,
        voteAverage: movie.vote_average,
      }));
    } catch {
      throw new TmdbUnavailableError();
    }
  };
}

export type CatalogMediaType = "movie" | "tv";

export interface CatalogSearchResult {
  id: number;
  mediaType: CatalogMediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
}

interface TmdbSearchItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

export type SearchCatalog = (
  query: string,
  mediaType: CatalogMediaType,
) => Promise<CatalogSearchResult[]>;

export function makeSearchCatalog(
  token: string,
  fetcher: typeof fetch = fetch,
): SearchCatalog {
  return async (query, mediaType) => {
    const url = new URL(`https://api.themoviedb.org/3/search/${mediaType}`);
    url.searchParams.set("query", query);
    url.searchParams.set("language", "pt-BR");
    url.searchParams.set("include_adult", "false");

    let response: Response;
    try {
      response = await fetcher(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new TmdbUnavailableError();
    }

    if (!response.ok) throw new TmdbUnavailableError();

    try {
      const payload = (await response.json()) as { results?: TmdbSearchItem[] };
      if (!Array.isArray(payload.results))
        throw new Error("Invalid TMDB response");
      return payload.results.map((item) => ({
        id: item.id,
        mediaType,
        title: mediaType === "movie" ? (item.title ?? "") : (item.name ?? ""),
        overview: item.overview,
        posterPath: item.poster_path,
        releaseDate:
          mediaType === "movie"
            ? (item.release_date ?? "")
            : (item.first_air_date ?? ""),
        voteAverage: item.vote_average,
      }));
    } catch {
      throw new TmdbUnavailableError();
    }
  };
}
