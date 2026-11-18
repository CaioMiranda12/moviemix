import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { playlistsApi, type PlaylistDetails } from "../lib/playlists-api";

export function PublicPlaylistPage() {
  const { id } = useParams();
  const [data, setData] = useState<PlaylistDetails | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!id) return;
    let active = true;
    playlistsApi
      .publicGet(id)
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active)
          setError("Esta lista não está disponível para compartilhamento.");
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 text-zinc-100 sm:px-8">
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
      {!error && !data && <p role="status">Carregando coleção...</p>}
      {data && (
        <>
          <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950 to-zinc-900 p-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-300">
              Coleção compartilhada · MovieMix
            </p>
            <h1 className="break-words text-4xl font-black">
              {data.playlist.name}
            </h1>
            {data.playlist.description && (
              <p className="mt-3 text-zinc-300">{data.playlist.description}</p>
            )}
            <p className="mt-4 text-sm text-zinc-400">
              {data.items.length} título(s) · Somente leitura
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
                className="flex items-center gap-4 p-4"
              >
                <span className="w-6 text-sm text-zinc-500">{index + 1}</span>
                {item.posterPath ? (
                  <img
                    alt=""
                    loading="lazy"
                    src={`https://image.tmdb.org/t/p/w185${item.posterPath}`}
                    className="h-16 w-11 rounded object-cover"
                  />
                ) : (
                  <div className="h-16 w-11 rounded bg-zinc-800" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-zinc-400">
                    {item.mediaType === "movie" ? "Filme" : "Série"}
                    {item.releaseDate
                      ? ` · ${item.releaseDate.slice(0, 4)}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
