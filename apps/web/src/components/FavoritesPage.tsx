import { useDeleteConfirmation } from "./useDeleteConfirmation";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListSearch } from "./ListSearch";
import { ListSort } from "./ListSort";
import { sortListItems, type ListSortKey } from "./list-sort-utils";
import { matchesListSearch } from "./list-search-utils";
import { favoritesApi, type FavoriteItem } from "../lib/favorites-api";
import { ratingsApi } from "../lib/ratings-api";

export function FavoritesPage() {
  const { confirmDelete, confirmationDialog } = useDeleteConfirmation();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ListSortKey>("added-newest");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    favoritesApi
      .list()
      .then((results) => {
        if (active) setItems(results);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar sua lista.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    ratingsApi
      .list()
      .then((results) => {
        if (!active) return;
        setScores(
          Object.fromEntries(
            results.map((rating) => [
              `${rating.mediaType}-${rating.id}`,
              rating.score,
            ]),
          ),
        );
      })
      .catch(() => {
        // Uma falha ao carregar as notas não deve impedir o acesso aos favoritos.
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = sortListItems(
    items.filter((item) => matchesListSearch(item.title, query)),
    sort,
    (item) => scores[`${item.mediaType}-${item.id}`],
  );

  async function remove(item: FavoriteItem) {
    if (
      !(await confirmDelete(
        "Remover dos favoritos?",
        `Remover "${item.title}"?`,
        "Remover favorito",
      ))
    )
      return;
    const key = `${item.mediaType}-${item.id}`;
    setRemoving(key);
    setError("");
    try {
      await favoritesApi.remove(item.mediaType, item.id);
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
          : "Não foi possível remover o título.",
      );
    } finally {
      setRemoving("");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 pb-28 sm:px-8 md:pb-8">
      {confirmationDialog}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <Link to="/" className="text-2xl font-bold text-emerald-400">
          MovieMix
        </Link>
        <Link to="/" className="text-sm text-emerald-400 hover:underline">
          ← Voltar ao catálogo
        </Link>
      </header>
      <section className="py-10">
        <h1 className="text-3xl font-bold">Minha Lista</h1>
        <p className="mt-2 text-zinc-400">Seus filmes e séries favoritos.</p>
        <div className="flex flex-wrap items-end gap-4">
          <ListSearch value={query} onChange={setQuery} />
          <ListSort
            value={sort}
            onChange={(value) => setSort(value as ListSortKey)}
            options={[
              { value: "added-newest", label: "Adicionados recentemente" },
              { value: "added-oldest", label: "Adicionados há mais tempo" },
              { value: "title-asc", label: "Título (A–Z)" },
              { value: "title-desc", label: "Título (Z–A)" },
              { value: "release-newest", label: "Lançamento (mais recente)" },
              { value: "release-oldest", label: "Lançamento (mais antigo)" },
              { value: "score-highest", label: "Minha nota (maior primeiro)" },
              { value: "score-lowest", label: "Minha nota (menor primeiro)" },
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
            Carregando favoritos...
          </p>
        ) : items.length === 0 ? (
          <div className="mt-8 space-y-4">
            <p className="text-zinc-400">
              Sua lista está vazia. Explore o catálogo e salve seus títulos
              favoritos.
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
                  <div className="p-4">
                    <h2 className="line-clamp-2 font-semibold">{item.title}</h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      {item.mediaType === "movie" ? "Filme" : "Série"} ·{" "}
                      {item.releaseDate?.slice(0, 4) || "Sem data"}
                    </p>
                    {scores[`${item.mediaType}-${item.id}`] != null && (
                      <p
                        className="mt-2 text-sm font-medium text-amber-400"
                        aria-label={`Sua avaliação: ${scores[`${item.mediaType}-${item.id}`]} de 5 estrelas`}
                      >
                        ★ {scores[`${item.mediaType}-${item.id}`]}/5
                      </p>
                    )}
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
                      : "Remover da lista"}
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
