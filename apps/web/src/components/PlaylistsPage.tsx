import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { playlistsApi, type Playlist } from "../lib/playlists-api";

export function PlaylistsPage() {
  const [lists, setLists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    playlistsApi
      .list()
      .then((items) => {
        if (active) {
          setLists(items);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Erro ao carregar listas.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 80 || busy) return;
    setBusy(true);
    setError("");
    try {
      const item = await playlistsApi.create(trimmed);
      setLists((current) => [item, ...current]);
      setName("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao criar lista.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function rename(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed || trimmed.length > 80 || busy) return;
    setBusy(true);
    setError("");
    try {
      const item = await playlistsApi.rename(id, trimmed);
      setLists((current) =>
        current.map((entry) => (entry.id === id ? item : entry)),
      );
      setEditing(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao renomear lista.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Playlist) {
    if (
      busy ||
      !window.confirm(
        `Excluir a lista "${item.name}"? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await playlistsApi.remove(item.id);
      setLists((current) => current.filter((entry) => entry.id !== item.id));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Erro ao excluir lista.",
      );
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-white/20 bg-zinc-900 px-3 py-3 text-white focus-visible:outline-2 focus-visible:outline-emerald-400";
  const button =
    "rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white";
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 pb-28 sm:px-8 md:pb-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <Link to="/" className="text-2xl font-bold text-emerald-400">
          MovieMix
        </Link>
        <Link to="/" className="text-sm text-emerald-400 hover:underline">
          ← Voltar ao catálogo
        </Link>
      </header>
      <h1 className="mb-2 text-3xl font-bold">Minhas listas</h1>
      <p className="mb-8 text-zinc-400">
        Organize suas coleções pessoais. Adicionar filmes e séries estará
        disponível na próxima sprint.
      </p>
      <form
        onSubmit={create}
        className="mb-8 flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="playlist-name" className="mb-2 block font-medium">
            Nome da nova lista
          </label>
          <input
            id="playlist-name"
            className={field}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            placeholder="Ex.: Filmes para assistir"
          />
        </div>
        <button
          type="submit"
          className={button}
          disabled={busy || !name.trim()}
        >
          Criar lista
        </button>
      </form>
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-500/40 p-4 text-red-300"
        >
          {error}
        </div>
      )}
      {loading ? (
        <p role="status" className="text-zinc-400">
          Carregando listas...
        </p>
      ) : error && lists.length === 0 ? (
        <button
          type="button"
          className={button}
          onClick={() => {
            setLoading(true);
            setRetry((value) => value + 1);
          }}
        >
          Tentar novamente
        </button>
      ) : lists.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/20 p-8 text-center text-zinc-400">
          Você ainda não criou nenhuma lista. Comece pela primeira!
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {lists.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-white/15 bg-zinc-900/60 p-5"
            >
              {editing === item.id ? (
                <form
                  onSubmit={(event) => rename(event, item.id)}
                  className="space-y-3"
                >
                  <label
                    htmlFor={`rename-${item.id}`}
                    className="block font-medium"
                  >
                    Renomear lista
                  </label>
                  <input
                    id={`rename-${item.id}`}
                    className={field}
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    maxLength={80}
                    required
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className={button}
                      disabled={busy || !editName.trim()}
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/20 px-4 py-3"
                      onClick={() => setEditing(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h2 className="break-words text-xl font-semibold">
                    {item.name}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Lista privada · Sem títulos por enquanto
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="rounded-lg border border-white/20 px-4 py-2 focus-visible:outline-2 focus-visible:outline-emerald-400"
                      disabled={busy}
                      onClick={() => {
                        setEditing(item.id);
                        setEditName(item.name);
                      }}
                    >
                      Renomear
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-500/40 px-4 py-2 text-red-300 focus-visible:outline-2 focus-visible:outline-red-400"
                      disabled={busy}
                      onClick={() => void remove(item)}
                    >
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
