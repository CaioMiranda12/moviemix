import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  catalogApi,
  type CatalogItem,
  type MediaType,
} from "../lib/catalog-api";
import { playlistsApi, type PlaylistDetails } from "../lib/playlists-api";

export function PlaylistDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState<PlaylistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<MediaType>("movie");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    playlistsApi
      .get(id)
      .then((value) => {
        if (active) {
          setData(value);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Erro ao carregar lista.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, revision]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setResults([]);
    try {
      setResults(await catalogApi.search(query.trim(), type));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro na busca.");
    } finally {
      setSearching(false);
    }
  }

  async function add(item: CatalogItem) {
    if (!id || busy) return;
    setBusy(true);
    setFeedback("");
    setError("");
    try {
      await playlistsApi.addItem(id, type, item.id);
      setFeedback(`${item.title} adicionado à lista.`);
      setRevision((n) => n + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao adicionar título.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(mediaType: MediaType, mediaId: number) {
    if (!id || busy) return;
    setBusy(true);
    setFeedback("");
    setError("");
    try {
      await playlistsApi.removeItem(id, mediaType, mediaId);
      setRevision((n) => n + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao remover título.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 pb-28 text-zinc-100 sm:px-8 md:pb-8">
      <header className="mb-8 flex items-center justify-between border-b border-white/10 pb-6">
        <Link to="/lists" className="text-emerald-400 hover:underline">
          ← Minhas listas
        </Link>
        <Link to="/" className="text-sm text-zinc-300 hover:underline">
          Catálogo
        </Link>
      </header>
      {loading && !data ? <p role="status">Carregando lista...</p> : null}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-500/40 p-3 text-red-300"
        >
          {error}
        </p>
      )}
      {feedback && (
        <p role="status" className="mb-4 text-emerald-400">
          {feedback}
        </p>
      )}
      {data && (
        <>
          <h1 className="mb-2 break-words text-3xl font-bold">
            {data.playlist.name}
          </h1>
          <p className="mb-8 text-zinc-400">
            Lista privada · {data.items.length} título(s)
          </p>
          <section aria-labelledby="playlist-items-heading" className="mb-10">
            <h2
              id="playlist-items-heading"
              className="mb-4 text-xl font-semibold"
            >
              Títulos da lista
            </h2>
            {data.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/20 p-6 text-zinc-400">
                Esta lista está vazia. Busque um filme ou série abaixo para
                começar.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {data.items.map((item) => (
                  <li
                    key={`${item.mediaType}-${item.id}`}
                    className="flex gap-4 rounded-xl border border-white/15 bg-zinc-900/60 p-4"
                  >
                    {item.posterPath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                        alt=""
                        className="h-28 w-20 rounded object-cover"
                      />
                    ) : (
                      <div className="h-28 w-20 rounded bg-zinc-800" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        className="font-semibold hover:text-emerald-400"
                        to={`/${item.mediaType}/${item.id}`}
                      >
                        {item.title}
                      </Link>
                      <p className="mt-1 text-sm text-zinc-400">
                        {item.mediaType === "movie" ? "Filme" : "Série"} ·{" "}
                        {item.releaseDate?.slice(0, 4) || "Ano não informado"}
                      </p>
                      <button
                        disabled={busy}
                        onClick={() => void remove(item.mediaType, item.id)}
                        className="mt-3 rounded border border-red-500/40 px-3 py-2 text-sm text-red-300 disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="playlist-search-heading">
            <h2
              id="playlist-search-heading"
              className="mb-4 text-xl font-semibold"
            >
              Adicionar filmes ou séries
            </h2>
            <form
              onSubmit={search}
              className="mb-5 flex flex-wrap items-end gap-3"
            >
              <div className="min-w-48 flex-1">
                <label htmlFor="playlist-search" className="mb-2 block">
                  Buscar título
                </label>
                <input
                  id="playlist-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-zinc-900 px-3 py-3"
                  placeholder="Ex.: Interestelar"
                  required
                />
              </div>
              <div>
                <label htmlFor="playlist-type" className="mb-2 block">
                  Tipo
                </label>
                <select
                  id="playlist-type"
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as MediaType);
                    setResults([]);
                  }}
                  className="rounded-lg border border-white/20 bg-zinc-900 px-3 py-3"
                >
                  <option value="movie">Filmes</option>
                  <option value="tv">Séries</option>
                </select>
              </div>
              <button
                disabled={searching}
                className="rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 disabled:opacity-50"
              >
                {searching ? "Buscando..." : "Buscar"}
              </button>
            </form>
            <ul className="grid gap-3 sm:grid-cols-2">
              {results.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/15 p-3"
                >
                  <span className="min-w-0 truncate">{item.title}</span>
                  <button
                    type="button"
                    disabled={
                      busy ||
                      data.items.some(
                        (existing) =>
                          existing.id === item.id &&
                          existing.mediaType === type,
                      )
                    }
                    onClick={() => void add(item)}
                    className="shrink-0 rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                  >
                    {data.items.some(
                      (existing) =>
                        existing.id === item.id && existing.mediaType === type,
                    )
                      ? "Adicionado"
                      : "Adicionar"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
