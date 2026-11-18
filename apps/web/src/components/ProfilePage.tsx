import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { profileApi, type ProfileStats } from "../lib/profile-api";

type Metric = {
  label: string;
  value: string;
  description: string;
  to: string;
};

export function ProfilePage({ email }: { email: string }) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    profileApi
      .stats()
      .then((result) => {
        if (active) {
          setStats(result);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setStats(null);
          setError(
            reason instanceof Error
              ? reason.message
              : "Erro ao carregar estatísticas.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const metrics: Metric[] = stats
    ? [
        {
          label: "Favoritos",
          value: String(stats.favorites),
          description: "Títulos na Minha Lista",
          to: "/my-list",
        },
        {
          label: "Quero assistir",
          value: String(stats.wantToWatch),
          description: "Títulos planejados",
          to: "/watching",
        },
        {
          label: "Assistindo",
          value: String(stats.watching),
          description: "Em andamento",
          to: "/watching",
        },
        {
          label: "Concluídos",
          value: String(stats.watched),
          description: "Títulos finalizados",
          to: "/watching",
        },
        {
          label: "Avaliações",
          value: String(stats.ratings),
          description: "Notas registradas",
          to: "/ratings",
        },
        {
          label: "Nota média",
          value:
            stats.averageRating === null
              ? "—"
              : `${stats.averageRating.toFixed(2).replace(".", ",")} / 5`,
          description:
            stats.averageRating === null
              ? "Nenhuma avaliação ainda"
              : "Média das suas avaliações",
          to: "/ratings",
        },
      ]
    : [];

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
        <Link
          to="/lists"
          className="mb-6 inline-block rounded-lg border border-emerald-500/40 px-4 py-3 text-emerald-400 hover:bg-emerald-500/10"
        >
          Minhas listas personalizadas →
        </Link>
        <h1 className="text-3xl font-bold">Meu perfil</h1>
        <p className="mt-2 text-zinc-400">Resumo pessoal de {email}</p>
        {loading ? (
          <p role="status" className="mt-8 text-zinc-400">
            Carregando estatísticas...
          </p>
        ) : error ? (
          <div className="mt-8 space-y-4">
            <p role="alert" className="text-red-400">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setAttempt((n) => n + 1);
              }}
              className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/10"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div
            className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Estatísticas pessoais"
          >
            {metrics.map((metric) => (
              <Link
                key={metric.label}
                to={metric.to}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                <p className="text-sm font-medium text-zinc-300">
                  {metric.label}
                </p>
                <p className="mt-3 text-3xl font-bold text-emerald-400">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {metric.description}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
