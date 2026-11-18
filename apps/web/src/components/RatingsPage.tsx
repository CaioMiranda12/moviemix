import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListSearch } from "./ListSearch";
import { ListSort } from "./ListSort";
import { sortListItems, type ListSortKey } from "./list-sort-utils";
import { matchesListSearch } from "./list-search-utils";
import { ratingsApi, type RatingItem } from "../lib/ratings-api";

export function RatingsPage() {
  const [items, setItems] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ListSortKey>("updated-newest");
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    ratingsApi
      .list()
      .then((results) => {
        if (active) setItems(results);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar as avaliações.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = sortListItems(
    items.filter((item) => matchesListSearch(item.title, query)),
    sort,
  );

  async function remove(item: RatingItem) {
    const key = `${item.mediaType}-${item.id}`;
    setRemoving(key);
    setError("");
    try {
      await ratingsApi.remove(item.mediaType, item.id);
      setItems((current) =>
        current.filter(
          (entry) =>
            !(entry.id === item.id && entry.mediaType === item.mediaType),
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível remover a avaliação.",
      );
    } finally {
      setRemoving("");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <Link to="/" className="text-2xl font-bold text-emerald-400">
          MovieMix
        </Link>
        <Link to="/" className="text-sm text-emerald-400 hover:underline">
          ← Voltar ao catálogo
        </Link>
      </header>
      <section className="py-10">
        <h1 className="text-3xl font-bold">Minhas avaliações</h1>
        <p className="mt-2 text-zinc-400">
          Suas notas pessoais para filmes e séries.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <ListSearch value={query} onChange={setQuery} />
          <ListSort
            value={sort}
            onChange={(value) => setSort(value as ListSortKey)}
            options={[
              { value: "updated-newest", label: "Avaliados recentemente" },
              { value: "updated-oldest", label: "Avaliados há mais tempo" },
              { value: "title-asc", label: "Título (A–Z)" },
              { value: "title-desc", label: "Título (Z–A)" },
              { value: "release-newest", label: "Lançamento (mais recente)" },
              { value: "release-oldest", label: "Lançamento (mais antigo)" },
              { value: "score-highest", label: "Nota (maior primeiro)" },
              { value: "score-lowest", label: "Nota (menor primeiro)" },
            ]}
          />
        </div>
        {error && (
          <p role="alert" className="mt-6 text-red-400">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status" className="mt-8 text-zinc-400">
            Carregando avaliações...
          </p>
        ) : items.length === 0 ? (
          <div className="mt-8 space-y-3">
            <p className="text-zinc-400">
              Você ainda não avaliou nenhum título.
            </p>
            <Link
              to="/"
              className="inline-block text-emerald-400 hover:underline"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p role="status" className="mt-8 text-zinc-400">
            Nenhum título encontrado para sua busca.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((item) => (
              <article
                key={`${item.mediaType}-${item.id}`}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              >
                <Link
                  to={`/${item.mediaType}/${item.id}`}
                  className="block hover:bg-white/5"
                  aria-label={`Ver detalhes de ${item.title}`}
                >
                  <div className="aspect-[2/3] bg-zinc-800">
                    {item.posterPath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w342${item.posterPath}`}
                        alt={`Pôster de ${item.title}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-4 text-center text-zinc-400">
                        Pôster indisponível
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <h2 className="line-clamp-2 font-semibold">{item.title}</h2>
                    <p className="text-xs text-zinc-400">
                      {item.mediaType === "movie" ? "Filme" : "Série"} ·{" "}
                      {item.releaseDate?.slice(0, 4) || "Sem data"}
                    </p>
                    <p
                      className="text-amber-400"
                      aria-label={`Sua avaliação: ${item.score} de 5 estrelas`}
                    >
                      {"★".repeat(item.score)}
                      {"☆".repeat(5 - item.score)}{" "}
                      <span className="text-sm text-zinc-300">
                        {item.score}/5
                      </span>
                    </p>
                  </div>
                </Link>
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => void remove(item)}
                    disabled={Boolean(removing)}
                    className="text-sm text-red-300 hover:underline disabled:opacity-60"
                  >
                    {removing === `${item.mediaType}-${item.id}`
                      ? "Removendo..."
                      : "Remover avaliação"}
                  </button>
                </div>
              </article>
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
