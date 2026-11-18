import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  playlistsApi,
  type Playlist,
  type PlaylistDetails,
  type PlaylistItem,
} from "../lib/playlists-api";

type Props = { isAuthenticated: boolean };

export function PublicPlaylistPage({ isAuthenticated }: Props) {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState<PlaylistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedItem, setSelectedItem] = useState<PlaylistItem | null>(null);
  const [lists, setLists] = useState<Playlist[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [createNew, setCreateNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Lista não encontrada.");
      return;
    }
    let active = true;
    setLoading(true);
    playlistsApi
      .publicGet(id)
      .then((value) => {
        if (active) {
          setData(value);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError("Esta lista não está disponível para compartilhamento.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!selectedItem || !isAuthenticated) return;
    let active = true;
    setListsLoading(true);
    playlistsApi
      .list()
      .then((result) => {
        if (!active) return;
        setLists(result);
        if (result.length === 0) setCreateNew(true);
        setTargetId((previous) =>
          result.some((list) => list.id === previous)
            ? previous
            : (result[0]?.id ?? ""),
        );
      })
      .catch((reason: unknown) => {
        if (active)
          setSaveError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar suas listas.",
          );
      })
      .finally(() => {
        if (active) setListsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedItem, isAuthenticated]);

  function openSave(item: PlaylistItem) {
    setSelectedItem(item);
    setSaveError("");
    setNotice("");
    setCreateNew(false);
    setNewName("");
  }

  function closeSave() {
    if (!saving) setSelectedItem(null);
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem || !isAuthenticated || saving) return;
    const name = newName.trim();
    if (createNew && (!name || name.length > 80)) return;
    if (!createNew && !targetId) return;
    setSaving(true);
    setSaveError("");
    try {
      // Reutiliza os endpoints autenticados. A lista compartilhada nunca é modificada.
      const destination = createNew
        ? await playlistsApi.create(name)
        : lists.find((list) => list.id === targetId);
      if (!destination) throw new Error("Selecione uma lista válida.");
      try {
        await playlistsApi.addItem(
          destination.id,
          selectedItem.mediaType,
          selectedItem.id,
        );
      } catch (reason) {
        if (createNew) {
          // A lista criada permanece disponível para o usuário tentar novamente.
          setLists((current) => [destination, ...current]);
          setTargetId(destination.id);
          setCreateNew(false);
        }
        throw reason;
      }
      setNotice(
        `“${selectedItem.title}” foi adicionado à lista “${destination.name}”.`,
      );
      setSelectedItem(null);
    } catch (reason) {
      setSaveError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar o título.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6 pb-8 text-zinc-100 sm:px-8 sm:py-8">
      <header className="mb-8">
        <Link to="/" className="font-bold text-emerald-400">
          MovieMix
        </Link>
      </header>
      {error && (
        <p role="alert" className="rounded-xl border border-white/10 p-5">
          {error}
        </p>
      )}
      {loading && <p role="status">Carregando coleção...</p>}
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-emerald-200"
        >
          {notice}
        </p>
      )}
      {data && !error && (
        <>
          <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950 to-zinc-900 p-5 sm:p-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-300">
              Coleção compartilhada · MovieMix
            </p>
            <h1 className="break-words text-3xl font-black sm:text-4xl">
              {data.playlist.name}
            </h1>
            {data.playlist.description && (
              <p className="mt-3 text-zinc-300">{data.playlist.description}</p>
            )}
            <p className="mt-4 text-sm text-zinc-400">
              {data.items.length} título(s) · Coleção somente leitura
            </p>
          </section>
          <h2 className="mb-4 text-xl font-semibold">Títulos da coleção</h2>
          {data.items.length === 0 && (
            <p className="text-zinc-400">Esta coleção está vazia.</p>
          )}
          <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40">
            {data.items.map((item, index) => (
              <li
                key={`${item.mediaType}-${item.id}`}
                className="flex min-w-0 items-center gap-2 p-3 sm:gap-4 sm:p-4"
              >
                <span className="hidden w-6 shrink-0 text-sm text-zinc-500 sm:block">
                  {index + 1}
                </span>
                {item.posterPath ? (
                  <img
                    alt=""
                    loading="lazy"
                    src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                    className="h-16 w-11 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="h-16 w-11 shrink-0 rounded bg-zinc-800" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold">{item.title}</p>
                  <p className="text-sm text-zinc-400">
                    {item.mediaType === "movie" ? "Filme" : "Série"}
                    {item.releaseDate
                      ? ` · ${item.releaseDate.slice(0, 4)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openSave(item)}
                  aria-label={`Adicionar ${item.title} à minha lista`}
                  className="shrink-0 rounded-xl border border-emerald-500/40 px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-900/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                >
                  <span aria-hidden="true">＋</span>
                  <span className="hidden sm:inline"> Salvar</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSave();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-zinc-900 p-4 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="save-title"
                className="min-w-0 break-words text-lg font-bold sm:text-xl"
              >
                Salvar “{selectedItem.title}”
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={closeSave}
                disabled={saving}
                className="rounded-lg px-2 py-1 text-zinc-300 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            {!isAuthenticated ? (
              <div className="space-y-4">
                <p className="text-zinc-300">
                  Você pode explorar esta coleção sem uma conta, mas precisa
                  fazer login para salvar filmes e séries nas suas listas.
                </p>
                <Link
                  to="/login"
                  state={{ from: location.pathname }}
                  className="inline-block rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950"
                >
                  Fazer login
                </Link>
                <p className="text-sm text-zinc-400">
                  Ainda não tem conta?{" "}
                  <Link to="/register" className="text-emerald-300 underline">
                    Cadastre-se
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={saveItem} className="space-y-4">
                {listsLoading ? (
                  <p role="status">Carregando suas listas...</p>
                ) : (
                  <>
                    <fieldset className="space-y-2">
                      <legend className="mb-2 font-semibold">
                        Onde deseja salvar?
                      </legend>
                      <label className="flex min-h-11 items-center gap-2">
                        <input
                          type="radio"
                          name="destination"
                          checked={!createNew}
                          onChange={() => setCreateNew(false)}
                          disabled={lists.length === 0}
                        />{" "}
                        Lista existente
                      </label>
                      {!createNew && (
                        <select
                          aria-label="Escolha uma lista"
                          value={targetId}
                          onChange={(event) => setTargetId(event.target.value)}
                          className="w-full rounded-lg border border-white/20 bg-zinc-800 p-3"
                          disabled={lists.length === 0}
                        >
                          {lists.length === 0 && (
                            <option value="">Nenhuma lista disponível</option>
                          )}
                          {lists.map((list) => (
                            <option key={list.id} value={list.id}>
                              {list.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <label className="flex min-h-11 items-center gap-2">
                        <input
                          type="radio"
                          name="destination"
                          checked={createNew}
                          onChange={() => setCreateNew(true)}
                        />{" "}
                        Criar nova lista
                      </label>
                      {createNew && (
                        <input
                          aria-label="Nome da nova lista"
                          placeholder="Ex.: Filmes para assistir"
                          maxLength={80}
                          value={newName}
                          onChange={(event) => setNewName(event.target.value)}
                          className="w-full rounded-lg border border-white/20 bg-zinc-800 p-3"
                        />
                      )}
                    </fieldset>
                    {lists.length === 0 && !createNew && (
                      <button
                        type="button"
                        className="text-sm text-emerald-300 underline"
                        onClick={() => setCreateNew(true)}
                      >
                        Criar minha primeira lista
                      </button>
                    )}
                  </>
                )}
                {saveError && (
                  <p role="alert" className="text-sm text-red-300">
                    {saveError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={
                    saving ||
                    listsLoading ||
                    (createNew ? !newName.trim() : !targetId)
                  }
                  className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar título"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
