import { FavoriteButton } from "./FavoriteButton";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getCatalogDetails,
  type CatalogDetails,
  type MediaType,
} from "../lib/catalog-api";

export function TitleDetailsPage() {
  const { mediaType, id } = useParams();
  const [details, setDetails] = useState<CatalogDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const validType = mediaType === "movie" || mediaType === "tv";
    if (!validType || !id) return;

    getCatalogDetails(mediaType as MediaType, id)
      .then((result) => {
        if (active) setDetails(result);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar os detalhes.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mediaType, id]);

  const invalidRoute =
    (mediaType !== "movie" && mediaType !== "tv") ||
    !id ||
    !/^[1-9]\d*$/.test(id) ||
    !Number.isSafeInteger(Number(id));
  const posterUrl = details?.posterPath
    ? `https://image.tmdb.org/t/p/w500${details.posterPath}`
    : null;
  const backdropUrl = details?.backdropPath
    ? `https://image.tmdb.org/t/p/w1280${details.backdropPath}`
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 text-zinc-100 sm:px-8">
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <Link to="/" className="text-2xl font-bold text-emerald-400">
          MovieMix
        </Link>
        <Link to="/" className="text-sm text-emerald-400 hover:underline">
          ← Voltar ao catálogo
        </Link>
      </header>

      {invalidRoute ? (
        <p role="alert" className="py-12 text-red-400">
          Endereço de título inválido.
        </p>
      ) : loading ? (
        <p role="status" className="py-12 text-zinc-400">
          Carregando detalhes...
        </p>
      ) : error ? (
        <div className="py-12">
          <p role="alert" className="text-red-400">
            {error}
          </p>
          <Link
            to="/"
            className="mt-4 inline-block text-emerald-400 hover:underline"
          >
            Voltar ao catálogo
          </Link>
        </div>
      ) : details ? (
        <article className="pb-12">
          {backdropUrl && (
            <div className="relative mt-8 aspect-[16/6] overflow-hidden rounded-2xl bg-zinc-800">
              <img
                src={backdropUrl}
                alt={`Imagem de fundo de ${details.title}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
            </div>
          )}
          <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
            <div className="overflow-hidden rounded-xl bg-zinc-800 md:self-start">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={`Pôster de ${details.title}`}
                  className="w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center p-4 text-center text-zinc-400">
                  Pôster indisponível
                </div>
              )}
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-emerald-400">
                {details.mediaType === "movie" ? "Filme" : "Série"}
              </p>
              <h1 className="text-3xl font-bold sm:text-4xl">
                {details.title}
              </h1>
              <p className="mt-4 text-zinc-400">
                {details.releaseDate || "Lançamento não informado"} · Nota{" "}
                {details.voteAverage.toFixed(1)} / 10
              </p>
              {details.genres.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {details.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="rounded-full border border-white/15 px-3 py-1 text-sm text-zinc-300"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}
              <FavoriteButton mediaType={details.mediaType} id={details.id} />
              <h2 className="mt-9 text-xl font-semibold">Sinopse</h2>
              <p className="mt-3 max-w-3xl leading-7 text-zinc-300">
                {details.overview || "Sinopse indisponível."}
              </p>
            </div>
          </div>
        </article>
      ) : null}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-zinc-500">
        Dados fornecidos por TMDB. Este produto não é endossado ou certificado
        pela TMDB.
      </footer>
    </main>
  );
}
