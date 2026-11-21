import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getCatalogDetails,
  type CatalogDetails,
  type MediaType,
} from "../lib/catalog-api";
import { playlistsApi, type Playlist } from "../lib/playlists-api";
import { FavoriteButton } from "./FavoriteButton";

export function MediaDetailsModal() {
  const { mediaType, id } = useParams();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [details, setDetails] = useState<CatalogDetails | null>(null);
  const [error, setError] = useState("");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selected, setSelected] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const close = () => navigate(-1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  useEffect(() => {
    let active = true;
    if (
      (mediaType !== "movie" && mediaType !== "tv") ||
      !id ||
      !/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(Number(id))
    ) {
      setError("Endereço de título inválido.");
      return;
    }
    getCatalogDetails(mediaType as MediaType, id)
      .then((result) => {
        if (active) setDetails(result);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar os detalhes.");
      });
    playlistsApi
      .list()
      .then((result) => {
        if (active) setPlaylists(result);
      })
      .catch(() => {
        if (active) setMessage("Não foi possível carregar suas listas.");
      });
    return () => {
      active = false;
    };
  }, [mediaType, id]);

  async function addToPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details || busy) return;
    const name = newName.trim();
    if (!selected && (!name || name.length > 100)) return;
    setBusy(true);
    setMessage("");
    try {
      const playlistId = selected || (await playlistsApi.create(name)).id;
      await playlistsApi.addItem(playlistId, details.mediaType, details.id);
      setMessage("Título adicionado à playlist!");
      setNewName("");
      if (!selected) setPlaylists(await playlistsApi.list());
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Não foi possível adicionar à playlist.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Detalhes do título"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      className="m-auto max-h-[92dvh] w-[min(94vw,850px)] max-w-none overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/80"
    >
      <div className="sticky top-0 z-20 flex justify-end bg-zinc-950/90 p-3">
        <button
          type="button"
          onClick={close}
          aria-label="Fechar detalhes"
          className="rounded-full border border-white/20 bg-zinc-800 px-4 py-2 font-bold focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          ✕
        </button>
      </div>
      {error ? (
        <p role="alert" className="p-6 text-red-400">
          {error}
        </p>
      ) : !details ? (
        <p role="status" className="p-6">
          Carregando detalhes...
        </p>
      ) : (
        <article className="px-5 pb-8 sm:px-8">
          {details.backdropPath && (
            <img
              className="mb-6 max-h-64 w-full rounded-xl object-cover"
              src={`https://image.tmdb.org/t/p/w1280${details.backdropPath}`}
              alt=""
            />
          )}
          <div className="grid gap-6 sm:grid-cols-[170px_1fr]">
            {details.posterPath && (
              <img
                className="mx-auto w-44 rounded-xl sm:w-full"
                src={`https://image.tmdb.org/t/p/w342${details.posterPath}`}
                alt={`Pôster de ${details.title}`}
              />
            )}
            <div>
              <p className="text-sm text-emerald-400">
                {details.mediaType === "movie" ? "Filme" : "Série"}
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                {details.title}
              </h2>
              <p className="mt-3 text-sm text-zinc-400">
                {details.releaseDate || "Data não informada"} · Nota{" "}
                {details.voteAverage.toFixed(1)} / 10
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {details.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
              <FavoriteButton mediaType={details.mediaType} id={details.id} />
            </div>
          </div>
          <h3 className="mt-7 text-lg font-semibold">Sinopse</h3>
          <p className="mt-2 leading-7 text-zinc-300">
            {details.overview || "Sinopse indisponível."}
          </p>
          <form
            onSubmit={(event) => void addToPlaylist(event)}
            className="mt-8 space-y-3 border-t border-white/15 pt-6"
          >
            <h3 className="text-lg font-semibold">Adicionar à playlist</h3>
            <label htmlFor="modal-playlist" className="block text-sm">
              Escolha uma lista ou crie outra
            </label>
            <select
              id="modal-playlist"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-zinc-900 p-3"
            >
              <option value="">Criar nova lista</option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
            {!selected && (
              <input
                aria-label="Nome da nova lista"
                value={newName}
                maxLength={100}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Nome da nova lista"
                className="w-full rounded-xl border border-white/20 bg-zinc-900 p-3"
              />
            )}
            <button
              type="submit"
              disabled={busy || (!selected && !newName.trim())}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-zinc-950 disabled:opacity-50"
            >
              {busy ? "Adicionando..." : "Adicionar à playlist"}
            </button>
            {message && (
              <p role="status" className="text-sm text-zinc-300">
                {message}
              </p>
            )}
          </form>
        </article>
      )}
    </dialog>
  );
}
