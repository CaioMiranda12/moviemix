import { useDeleteConfirmation } from "./useDeleteConfirmation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  catalogApi,
  type CatalogItem,
  type MediaType,
} from "../lib/catalog-api";
import {
  playlistsApi,
  type PlaylistDetails,
  type PlaylistItem,
} from "../lib/playlists-api";

export function PlaylistDetailsPage() {
  const { confirmDelete, confirmationDialog } = useDeleteConfirmation();
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
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("recent");
  const [showAdd, setShowAdd] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [sharingBusy, setSharingBusy] = useState(false);

  const visibleItems = useMemo(() => {
    const items = (data?.items ?? []).filter((item) =>
      `${item.title} ${item.mediaType === "movie" ? "filme" : "série"}`
        .toLocaleLowerCase("pt-BR")
        .includes(filter.trim().toLocaleLowerCase("pt-BR")),
    );
    return [...items].sort((a, b) => {
      if (sort === "manual") return 0;
      if (sort === "title") return a.title.localeCompare(b.title, "pt-BR");
      if (sort === "oldest") return a.addedAt.localeCompare(b.addedAt);
      return b.addedAt.localeCompare(a.addedAt);
    });
  }, [data, filter, sort]);

  function itemKey(item: PlaylistItem) {
    return `${item.mediaType}:${item.id}`;
  }

  async function moveItem(fromKey: string, toKey: string) {
    if (
      !id ||
      !data ||
      busy ||
      savingOrder ||
      fromKey === toKey ||
      filter.trim()
    )
      return;
    const items = [...data.items];
    const from = items.findIndex((item) => itemKey(item) === fromKey);
    const to = items.findIndex((item) => itemKey(item) === toKey);
    if (from < 0 || to < 0) return;
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    setSavingOrder(true);
    setError("");
    setFeedback("");
    try {
      await playlistsApi.reorderItems(
        id,
        items.map(({ mediaType, id: mediaId }) => ({ mediaType, id: mediaId })),
      );
      setData({ ...data, items });
      setFeedback("Ordem personalizada salva.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar a ordem.",
      );
      setRevision((n) => n + 1);
    } finally {
      setSavingOrder(false);
    }
  }

  function poster(item: PlaylistItem, size = "w185") {
    return item.posterPath
      ? `https://image.tmdb.org/t/p/${size}${item.posterPath}`
      : null;
  }

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

  async function toggleSharing() {
    if (!id || !data || sharingBusy) return;
    setSharingBusy(true);
    setError("");
    try {
      const visibility =
        data.playlist.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
      const playlist = await playlistsApi.setVisibility(id, visibility);
      setData({ ...data, playlist });
      setFeedback(
        visibility === "PUBLIC"
          ? "Compartilhamento ativado."
          : "Compartilhamento desativado.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao alterar compartilhamento.",
      );
    } finally {
      setSharingBusy(false);
    }
  }

  async function copyShareLink() {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/shared/lists/${encodeURIComponent(id)}`,
      );
      setFeedback("Link copiado!");
    } catch {
      setError("Não foi possível copiar o link. Copie o endereço manualmente.");
    }
  }

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
    if (!id || busy || savingOrder) return;
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
    if (!id || busy || savingOrder) return;
    const selected = data?.items.find(
      (item) => item.id === mediaId && item.mediaType === mediaType,
    );
    if (
      !(await confirmDelete(
        "Remover título da lista?",
        `Remover "${selected?.title ?? "este título"}" desta lista?`,
        "Remover título",
      ))
    )
      return;
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
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 pb-28 text-zinc-100 sm:px-8 sm:py-8 md:pb-8">
      {confirmationDialog}
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
          <section
            aria-label="Apresentação da lista"
            className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 grid grid-cols-4 opacity-30 sm:grid-cols-6"
            >
              {data.items
                .filter((item) => item.posterPath)
                .slice(0, 6)
                .map((item) => (
                  <img
                    key={`${item.mediaType}-${item.id}`}
                    src={poster(item, "w342") ?? ""}
                    alt=""
                    className="h-full min-h-64 w-full object-cover"
                  />
                ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/30" />
            <div className="relative flex min-h-56 flex-col justify-end gap-3 px-4 py-6 sm:min-h-64 sm:px-10 sm:py-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                {data.playlist.visibility === "PUBLIC"
                  ? "Coleção pública"
                  : "Coleção privada"}{" "}
                · MovieMix
              </p>
              <h1 className="max-w-3xl break-words text-3xl font-black tracking-tight sm:text-6xl">
                {data.playlist.name}
              </h1>
              {data.playlist.description && (
                <p className="max-w-2xl text-zinc-300">
                  {data.playlist.description}
                </p>
              )}
              <p className="text-sm text-zinc-300">
                {data.items.length} título(s) ·{" "}
                {data.items.filter((item) => item.mediaType === "movie").length}{" "}
                filme(s) ·{" "}
                {data.items.filter((item) => item.mediaType === "tv").length}{" "}
                série(s)
              </p>
            </div>
          </section>
          <section
            aria-label="Compartilhamento da lista"
            className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4"
          >
            <span className="min-w-0 flex-1 basis-full text-sm text-zinc-300 sm:basis-auto">
              {data.playlist.visibility === "PUBLIC"
                ? "Pública: qualquer pessoa com o link pode visualizar."
                : "Privada: apenas você pode visualizar."}
            </span>
            <button
              type="button"
              disabled={sharingBusy}
              onClick={() => void toggleSharing()}
              className="w-full rounded-lg border border-emerald-500 px-4 py-3 text-emerald-300 disabled:opacity-50 sm:w-auto sm:py-2"
            >
              {data.playlist.visibility === "PUBLIC"
                ? "Desativar compartilhamento"
                : "Ativar compartilhamento"}
            </button>
            {data.playlist.visibility === "PUBLIC" && (
              <button
                type="button"
                onClick={() => void copyShareLink()}
                className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 sm:w-auto sm:py-2"
              >
                Copiar link
              </button>
            )}
          </section>
          <section aria-labelledby="playlist-items-heading" className="mb-10">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 id="playlist-items-heading" className="text-xl font-semibold">
                Títulos da lista
              </h2>
              <button
                type="button"
                onClick={() => setShowAdd((current) => !current)}
                aria-expanded={showAdd}
                aria-controls="playlist-add-section"
                className="w-full rounded-full bg-emerald-500 px-5 py-3 font-semibold sm:w-auto text-zinc-950 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              >
                {showAdd ? "Fechar busca" : "+ Adicionar títulos"}
              </button>
            </div>
            {data.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/20 p-6 text-zinc-400">
                Esta lista está vazia. Use “Adicionar títulos” para começar.
              </p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-3">
                  <div className="min-w-0 flex-[1_1_100%] sm:flex-1">
                    <label htmlFor="playlist-filter" className="sr-only">
                      Buscar na lista
                    </label>
                    <input
                      id="playlist-filter"
                      type="search"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                      placeholder="Buscar nesta lista..."
                      className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <label htmlFor="playlist-sort" className="sr-only">
                      Ordenar títulos
                    </label>
                    <select
                      id="playlist-sort"
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    >
                      <option value="manual">Minha ordem</option>
                      <option value="recent">Adicionados recentemente</option>
                      <option value="oldest">Adicionados primeiro</option>
                      <option value="title">Título (A–Z)</option>
                    </select>
                  </div>
                </div>
                {sort === "manual" &&
                !filter.trim() &&
                data.items.length > 1 ? (
                  <p className="mb-3 text-sm text-zinc-400">
                    Arraste os títulos ou use os botões de subir e descer para
                    organizar sua lista.
                  </p>
                ) : null}
                {visibleItems.length === 0 ? (
                  <p role="status" className="py-6 text-zinc-400">
                    Nenhum título corresponde à busca.
                  </p>
                ) : null}
                <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40">
                  {visibleItems.map((item, index) => (
                    <li
                      key={`${item.mediaType}-${item.id}`}
                      draggable={
                        sort === "manual" && !filter.trim() && !savingOrder
                      }
                      onDragStart={(event) => {
                        if (sort !== "manual" || filter.trim()) return;
                        setDragging(itemKey(item));
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", itemKey(item));
                      }}
                      onDragOver={(event) => {
                        if (dragging && sort === "manual")
                          event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const source = dragging;
                        setDragging(null);
                        if (source) void moveItem(source, itemKey(item));
                      }}
                      onDragEnd={() => setDragging(null)}
                      className="group flex min-w-0 flex-wrap items-center gap-3 px-3 py-3 transition-colors sm:flex-nowrap hover:bg-white/5 sm:gap-5 sm:px-5"
                    >
                      <span
                        aria-hidden="true"
                        className="hidden w-6 text-center text-sm tabular-nums text-zinc-500 sm:block"
                      >
                        {index + 1}
                      </span>
                      {poster(item) ? (
                        <img
                          src={poster(item) ?? ""}
                          alt=""
                          loading="lazy"
                          className="h-20 w-14 shrink-0 rounded-md object-cover sm:h-16 sm:w-11"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="h-20 w-14 shrink-0 rounded-md bg-zinc-800 sm:h-16 sm:w-11"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          className="block truncate font-semibold text-zinc-100 hover:text-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                          to={`/${item.mediaType}/${item.id}`}
                        >
                          {item.title}
                        </Link>
                        <p className="mt-1 text-sm text-zinc-400">
                          {item.mediaType === "movie" ? "Filme" : "Série"} ·{" "}
                          {item.releaseDate?.slice(0, 4) || "Ano não informado"}
                        </p>
                      </div>
                      {sort === "manual" &&
                      !filter.trim() &&
                      data.items.length > 1 ? (
                        <div
                          className="flex shrink-0 flex-col gap-1"
                          aria-label={`Ordenar ${item.title}`}
                        >
                          <button
                            type="button"
                            disabled={savingOrder || busy || index === 0}
                            onClick={() =>
                              void moveItem(
                                itemKey(item),
                                itemKey(visibleItems[index - 1]),
                              )
                            }
                            aria-label={`Mover ${item.title} para cima`}
                            className="rounded border border-white/15 px-2 py-1 text-xs hover:text-emerald-400 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={
                              savingOrder ||
                              busy ||
                              index === visibleItems.length - 1
                            }
                            onClick={() =>
                              void moveItem(
                                itemKey(item),
                                itemKey(visibleItems[index + 1]),
                              )
                            }
                            aria-label={`Mover ${item.title} para baixo`}
                            className="rounded border border-white/15 px-2 py-1 text-xs hover:text-emerald-400 disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(item.mediaType, item.id)}
                        aria-label={`Remover ${item.title} da lista`}
                        className="ml-auto shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-300 hover:border-red-500/50 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400 disabled:opacity-50"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          <section
            id="playlist-add-section"
            aria-labelledby="playlist-search-heading"
            hidden={!showAdd}
          >
            <h2
              id="playlist-search-heading"
              className="mb-4 text-xl font-semibold"
            >
              Buscar filmes ou séries para adicionar
            </h2>
            <form
              onSubmit={search}
              className="mb-5 flex flex-wrap items-end gap-3"
            >
              <div className="min-w-0 flex-[1_1_100%] sm:flex-1">
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
              <div className="min-w-0 flex-[1_1_100%] sm:flex-none">
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
                  className="w-full rounded-lg border border-white/20 bg-zinc-900 px-3 py-3"
                >
                  <option value="movie">Filmes</option>
                  <option value="tv">Séries</option>
                </select>
              </div>
              <button
                disabled={searching}
                className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 disabled:opacity-50 sm:w-auto"
              >
                {searching ? "Buscando..." : "Buscar"}
              </button>
            </form>
            <ul
              className="grid gap-3 sm:grid-cols-2"
              aria-label="Resultados da busca"
            >
              {results.map((item) => {
                const alreadyAdded = data.items.some(
                  (existing) =>
                    existing.id === item.id && existing.mediaType === type,
                );
                const year = /^\d{4}/.exec(item.releaseDate)?.[0];
                const rating =
                  Number.isFinite(item.voteAverage) && item.voteAverage > 0
                    ? item.voteAverage.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })
                    : null;
                return (
                  <li
                    key={item.id}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-white/15 bg-white/[0.03] p-3"
                  >
                    {item.posterPath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                        alt={`Pôster de ${item.title}`}
                        loading="lazy"
                        className="h-24 w-16 shrink-0 rounded-md bg-zinc-800 object-cover sm:h-28 sm:w-[75px]"
                      />
                    ) : (
                      <div
                        className="flex h-24 w-16 shrink-0 items-center justify-center rounded-md bg-zinc-800 px-1 text-center text-[10px] text-zinc-400 sm:h-28 sm:w-[75px]"
                        aria-label="Pôster indisponível"
                      >
                        Sem pôster
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-snug sm:text-base">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                        {year ?? "Ano indisponível"} ·{" "}
                        {type === "movie" ? "Filme" : "Série"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-300 sm:text-sm">
                        {rating
                          ? `★ ${rating} / 10 · TMDB`
                          : "Sem avaliação no TMDB"}
                      </p>
                      <button
                        type="button"
                        disabled={busy || savingOrder || alreadyAdded}
                        onClick={() => void add(item)}
                        className="mt-2 min-h-10 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50 sm:text-sm"
                        aria-label={`${alreadyAdded ? "Já adicionado" : "Adicionar"} ${item.title} à lista`}
                      >
                        {alreadyAdded ? "Adicionado" : "+ Adicionar"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
