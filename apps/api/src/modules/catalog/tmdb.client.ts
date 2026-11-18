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
  genre_ids?: number[];
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

export interface CatalogDetails {
  id: number;
  mediaType: CatalogMediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genres: { id: number; name: string }[];
}

export class TmdbNotFoundError extends Error {
  constructor() {
    super("TMDB title not found");
    this.name = "TmdbNotFoundError";
  }
}

export type GetCatalogDetails = (
  mediaType: CatalogMediaType,
  id: number,
) => Promise<CatalogDetails>;

interface TmdbDetailsResponse {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genres: { id: number; name: string }[];
}

export function makeGetCatalogDetails(
  token: string,
  fetcher: typeof fetch = fetch,
): GetCatalogDetails {
  return async (mediaType, id) => {
    const url = new URL(`https://api.themoviedb.org/3/${mediaType}/${id}`);
    url.searchParams.set("language", "pt-BR");

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

    if (response.status === 404) throw new TmdbNotFoundError();
    if (!response.ok) throw new TmdbUnavailableError();

    try {
      const item = (await response.json()) as TmdbDetailsResponse;
      if (
        item.id !== id ||
        typeof item.overview !== "string" ||
        typeof item.vote_average !== "number" ||
        !Array.isArray(item.genres)
      ) {
        throw new Error("Invalid TMDB details response");
      }
      return {
        id: item.id,
        mediaType,
        title: mediaType === "movie" ? (item.title ?? "") : (item.name ?? ""),
        overview: item.overview,
        posterPath: item.poster_path ?? null,
        backdropPath: item.backdrop_path ?? null,
        releaseDate:
          mediaType === "movie"
            ? (item.release_date ?? "")
            : (item.first_air_date ?? ""),
        voteAverage: item.vote_average,
        genres: item.genres,
      };
    } catch {
      throw new TmdbUnavailableError();
    }
  };
}

export type DiscoverByGenre = (
  mediaType: CatalogMediaType,
  genreId: number,
) => Promise<CatalogSearchResult[]>;

export function makeDiscoverByGenre(
  token: string,
  fetcher: typeof fetch = fetch,
): DiscoverByGenre {
  return async (mediaType, genreId) => {
    const url = new URL(`https://api.themoviedb.org/3/discover/${mediaType}`);
    url.searchParams.set("language", "pt-BR");
    url.searchParams.set("with_genres", String(genreId));
    url.searchParams.set("sort_by", "popularity.desc");
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

export interface CatalogFilters {
  type: CatalogMediaType;
  query?: string;
  genre?: number;
  year?: number;
  minRating?: number;
}

export type FilterCatalog = (
  filters: CatalogFilters,
) => Promise<CatalogSearchResult[]>;

/** TMDB does not support text queries on /discover. For combined searches we
 * scan the first 10 search pages (at most 200 candidates), then apply filters.
 * F2-05 will add proper pagination; this is intentionally a bounded preview. */
export function makeFilterCatalog(
  token: string,
  fetcher: typeof fetch = fetch,
): FilterCatalog {
  return async (filters) => {
    const hasText = Boolean(filters.query);
    const url = new URL(
      `https://api.themoviedb.org/3/${hasText ? "search" : "discover"}/${filters.type}`,
    );
    url.searchParams.set("language", "pt-BR");
    url.searchParams.set("include_adult", "false");
    if (hasText) url.searchParams.set("query", filters.query!);
    else {
      url.searchParams.set("sort_by", "popularity.desc");
      if (filters.genre !== undefined)
        url.searchParams.set("with_genres", String(filters.genre));
      if (filters.year !== undefined)
        url.searchParams.set(
          filters.type === "movie"
            ? "primary_release_year"
            : "first_air_date_year",
          String(filters.year),
        );
      if (filters.minRating !== undefined)
        url.searchParams.set("vote_average.gte", String(filters.minRating));
    }
    const results: CatalogSearchResult[] = [];
    const maxPages =
      hasText &&
      (filters.genre !== undefined ||
        filters.year !== undefined ||
        filters.minRating !== undefined)
        ? 10
        : 1;
    for (let page = 1; page <= maxPages; page++) {
      url.searchParams.set("page", String(page));
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
      let payload: { results?: TmdbSearchItem[]; total_pages?: number };
      try {
        payload = (await response.json()) as typeof payload;
        if (!Array.isArray(payload.results)) throw new Error("Invalid results");
      } catch {
        throw new TmdbUnavailableError();
      }
      for (const item of payload.results!) {
        const date =
          filters.type === "movie"
            ? (item.release_date ?? "")
            : (item.first_air_date ?? "");
        if (
          filters.genre !== undefined &&
          !item.genre_ids?.includes(filters.genre)
        )
          continue;
        if (
          filters.year !== undefined &&
          Number(date.slice(0, 4)) !== filters.year
        )
          continue;
        if (
          filters.minRating !== undefined &&
          !(item.vote_average >= filters.minRating)
        )
          continue;
        results.push({
          id: item.id,
          mediaType: filters.type,
          title:
            filters.type === "movie" ? (item.title ?? "") : (item.name ?? ""),
          overview: item.overview,
          posterPath: item.poster_path,
          releaseDate: date,
          voteAverage: item.vote_average,
        });
      }
      if (!hasText || page >= (payload.total_pages ?? 1)) break;
    }
    return results;
  };
}
