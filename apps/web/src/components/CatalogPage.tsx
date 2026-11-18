import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  catalogApi,
  type CatalogItem,
  type MediaType,
} from "../lib/catalog-api";

const GENRES: Record<MediaType, { id: number; name: string }[]> = {
  movie: [
    { id: 28, name: "Ação" },
    { id: 12, name: "Aventura" },
    { id: 35, name: "Comédia" },
    { id: 18, name: "Drama" },
    { id: 27, name: "Terror" },
    { id: 878, name: "Ficção científica" },
    { id: 16, name: "Animação" },
    { id: 53, name: "Suspense" },
    { id: 10749, name: "Romance" },
  ],
  tv: [
    { id: 10759, name: "Ação e aventura" },
    { id: 35, name: "Comédia" },
    { id: 18, name: "Drama" },
    { id: 80, name: "Crime" },
    { id: 9648, name: "Mistério" },
    { id: 10765, name: "Ficção científica e fantasia" },
    { id: 16, name: "Animação" },
    { id: 99, name: "Documentário" },
  ],
};

type CatalogPageProps = {
  email: string;
  onLogout: () => Promise<void>;
  loggingOut: boolean;
  logoutError: string;
};

function MovieCard({ item }: { item: CatalogItem }) {
  const posterUrl = item.posterPath
    ? `https://image.tmdb.org/t/p/w342${item.posterPath}`
    : null;
  const year = item.releaseDate?.slice(0, 4);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <Link
        to={`/${item.mediaType ?? "movie"}/${item.id}`}
        className="block h-full hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-emerald-400"
        aria-label={`Ver detalhes de ${item.title}`}
      >
        <div className="aspect-[2/3] bg-zinc-800">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={`Pôster de ${item.title}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center text-sm text-zinc-400">
              Pôster indisponível
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <h3 className="line-clamp-2 font-semibold">{item.title}</h3>
          <p className="text-xs text-zinc-400">
            {year || "Data não informada"} · Nota {item.voteAverage.toFixed(1)}
          </p>
          <p className="line-clamp-3 text-sm text-zinc-400">
            {item.overview || "Sinopse indisponível."}
          </p>
        </div>
      </Link>
    </article>
  );
}

export function CatalogPage({
  email,
  onLogout,
  loggingOut,
  logoutError,
}: CatalogPageProps) {
  const [query, setQuery] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [year, setYear] = useState("");
  const [minRating, setMinRating] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [filters, setFilters] = useState<{
    type: MediaType;
    query?: string;
    genre?: number;
    year?: number;
    minRating?: number;
  } | null>(null);
  const [search, setSearch] = useState<{
    query: string;
    type: MediaType;
  } | null>(null);
  const [discovery, setDiscovery] = useState<{
    type: MediaType;
    genreId: number;
    genreName: string;
  } | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    const request = filters
      ? catalogApi.filter(filters)
      : discovery
        ? catalogApi.discover(discovery.type, discovery.genreId)
        : search
          ? catalogApi.search(search.query, search.type)
          : catalogApi.trending();

    request
      .then((results) => {
        if (active) setItems(results);
      })
      .catch(() => {
        if (active) {
          setItems([]);
          setError("Não foi possível carregar o catálogo. Tente novamente.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, discovery, filters, retry]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed && (trimmed.length < 2 || trimmed.length > 100)) return;
    if (year && !/^(18[7-9]\d|19\d{2}|20\d{2}|2100)$/.test(year)) return;
    const next = {
      type: mediaType,
      query: trimmed || undefined,
      genre: selectedGenre ?? undefined,
      year: year ? Number(year) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
    };
    if (JSON.stringify(filters) === JSON.stringify(next) && !error) return;
    setSearch(null);
    setDiscovery(null);
    setFilters(next);
  }

  function clearFilters() {
    setSelectedGenre(null);
    setYear("");
    setMinRating("");
    setDiscovery(null);
    setSearch(null);
    const trimmed = query.trim();
    setFilters({ type: mediaType, query: trimmed || undefined });
  }

  function showTrending() {
    setQuery("");
    setYear("");
    setMinRating("");
    setSelectedGenre(null);
    setSearch(null);
    setDiscovery(null);
    setFilters(null);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <a href="#catalog-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-2xl font-bold text-emerald-400">MovieMix</p>
          <p className="mt-1 text-xs text-zinc-400">Conectado como {email}</p>
        </div>
        <nav
          aria-label="Navegação da conta"
          className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3"
        >
          <Link
            to="/profile"
            className="rounded-xl border border-sky-400/40 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-white/10"
          >
            Meu perfil
          </Link>
          <Link
            to="/ratings"
            className="rounded-xl border border-amber-400/40 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-white/10"
          >
            ★ Minhas avaliações
          </Link>
          <Link
            to="/watching"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10"
          >
            ◷ Acompanhamento
          </Link>
          <Link
            to="/my-list"
            className="rounded-xl border border-emerald-400/50 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-white/10"
          >
            ♥ Minha Lista
          </Link>
          <button
            type="button"
            onClick={() => void onLogout()}
            disabled={loggingOut}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-60"
          >
            {loggingOut ? "Saindo..." : "Sair"}
          </button>
        </nav>
      </header>

      {logoutError && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {logoutError}
        </p>
      )}

      <section id="catalog-content" tabIndex={-1} className="py-8 sm:py-10">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Descubra sua próxima história
        </h1>
        <p className="mt-3 text-zinc-400">
          Explore filmes em alta ou busque filmes e séries.
        </p>

        <form
          onSubmit={handleSearch}
          className="mt-7 flex flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="catalog-query" className="sr-only">
            Buscar título
          </label>
          <input
            id="catalog-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            minLength={2}
            maxLength={100}
            placeholder="Buscar filmes ou séries..."
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 outline-none focus:border-emerald-400"
          />
          <label htmlFor="catalog-type" className="sr-only">
            Tipo de conteúdo
          </label>
          <select
            id="catalog-type"
            value={mediaType}
            onChange={(event) => {
              setMediaType(event.target.value as MediaType);
              setSelectedGenre(null);
            }}
            className="rounded-xl border border-white/15 bg-zinc-900 px-4 py-3"
          >
            <option value="movie">Filmes</option>
            <option value="tv">Séries</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            Buscar
          </button>
        </form>
        <div
          className="mt-4 flex flex-wrap gap-3"
          aria-label="Filtros avançados"
        >
          <div>
            <label
              htmlFor="catalog-year"
              className="mb-1 block text-sm text-zinc-300"
            >
              Ano
            </label>
            <input
              id="catalog-year"
              type="number"
              min="1870"
              max="2100"
              placeholder="Todos"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="w-32 rounded-xl border border-white/15 bg-zinc-900 px-4 py-2"
            />
          </div>
          <div>
            <label
              htmlFor="catalog-rating"
              className="mb-1 block text-sm text-zinc-300"
            >
              Nota mínima TMDB
            </label>
            <select
              id="catalog-rating"
              value={minRating}
              onChange={(event) => setMinRating(event.target.value)}
              className="rounded-xl border border-white/15 bg-zinc-900 px-4 py-2"
            >
              <option value="">Qualquer nota</option>
              {[5, 6, 7, 8, 9].map((rating) => (
                <option key={rating} value={rating}>
                  {rating}+
                </option>
              ))}
            </select>
          </div>
        </div>
        {(selectedGenre !== null || year !== "" || minRating !== "") && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            Limpar filtros
          </button>
        )}
        <div className="mt-8 space-y-3" aria-label="Explorar por gênero">
          <h2 className="text-lg font-semibold">Explorar por gênero</h2>
          <p className="text-sm text-zinc-400">
            Selecione um gênero para descobrir novos títulos.
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Gêneros disponíveis"
          >
            {GENRES[mediaType].map((genre) => (
              <button
                key={`${mediaType}-${genre.id}`}
                type="button"
                aria-pressed={selectedGenre === genre.id}
                onClick={() => {
                  const nextGenre =
                    selectedGenre === genre.id ? null : genre.id;
                  setSelectedGenre(nextGenre);
                  setSearch(null);
                  if (query.trim() || year || minRating) {
                    setDiscovery(null);
                    setFilters({
                      type: mediaType,
                      query: query.trim() || undefined,
                      genre: nextGenre ?? undefined,
                      year: year ? Number(year) : undefined,
                      minRating: minRating ? Number(minRating) : undefined,
                    });
                  } else if (nextGenre !== null) {
                    setFilters(null);
                    setDiscovery({
                      type: mediaType,
                      genreId: nextGenre,
                      genreName: genre.name,
                    });
                  } else {
                    setFilters(null);
                    setDiscovery(null);
                  }
                }}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${selectedGenre === genre.id ? "border-emerald-400 bg-emerald-500 text-zinc-950" : "border-white/20 text-zinc-200 hover:bg-white/10"}`}
              >
                {genre.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section aria-live="polite" className="pb-16">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold sm:text-2xl">
            {filters
              ? `Resultados filtrados${filters.query ? ` para “${filters.query}”` : ""}`
              : discovery
                ? `${discovery.type === "movie" ? "Filmes" : "Séries"} · ${discovery.genreName}`
                : search
                  ? `Resultados para “${search.query}”`
                  : "Filmes em alta na semana"}
          </h2>
          {(search || discovery || filters) && (
            <button
              type="button"
              onClick={showTrending}
              className="text-sm font-medium text-emerald-400 hover:underline"
            >
              Voltar aos destaques
            </button>
          )}
        </div>

        {loading ? (
          <p role="status" className="text-zinc-400">
            Carregando catálogo...
          </p>
        ) : error ? (
          <div className="space-y-3">
            <p role="alert" className="text-red-400">
              {error}
            </p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              Tentar novamente
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-zinc-400">Nenhum resultado encontrado.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <MovieCard
                key={`${item.mediaType ?? "movie"}-${item.id}`}
                item={item}
              />
            ))}
          </div>
        )}
      </section>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-zinc-500">
        Dados fornecidos por TMDB. Este produto não é endossado ou certificado
        pela TMDB.
      </footer>
    </main>
  );
}
