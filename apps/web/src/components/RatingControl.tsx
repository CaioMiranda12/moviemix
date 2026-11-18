import { useDeleteConfirmation } from "./useDeleteConfirmation";
import { useEffect, useState } from "react";
import type { MediaType } from "../lib/catalog-api";
import { ratingsApi } from "../lib/ratings-api";

type Props = { mediaType: MediaType; id: number };

export function RatingControl({ mediaType, id }: Props) {
  const { confirmDelete, confirmationDialog } = useDeleteConfirmation();
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    ratingsApi
      .list()
      .then((items) => {
        if (active)
          setScore(
            items.find((item) => item.mediaType === mediaType && item.id === id)
              ?.score ?? null,
          );
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar a avaliação.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mediaType, id]);

  async function update(next: number | null) {
    if (saving || loading) return;
    if (
      next === null &&
      !(await confirmDelete(
        "Remover avaliação?",
        "Sua avaliação para este título será excluída.",
        "Remover avaliação",
      ))
    )
      return;
    setSaving(true);
    setError("");
    try {
      if (next === null) await ratingsApi.remove(mediaType, id);
      else await ratingsApi.set(mediaType, id, next);
      setScore(next);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar a avaliação.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 space-y-2" aria-label="Minha avaliação">
      {confirmationDialog}
      <h2 className="text-sm font-medium text-zinc-200">Minha avaliação</h2>
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex gap-1"
          role="group"
          aria-label="Avaliar de 1 a 5 estrelas"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Avaliar com ${value} ${value === 1 ? "estrela" : "estrelas"}`}
              aria-pressed={score === value}
              title={`${value} ${value === 1 ? "estrela" : "estrelas"}`}
              disabled={loading || saving}
              onClick={() => void update(value)}
              className={`rounded-md px-1 text-3xl focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:opacity-50 ${score !== null && value <= score ? "text-amber-400" : "text-zinc-600 hover:text-amber-300"}`}
            >
              ★
            </button>
          ))}
        </div>
        <span className="text-sm text-zinc-400">
          {score === null ? "Sem avaliação" : `${score}/5`}
        </span>
        {score !== null && (
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => void update(null)}
            className="text-sm text-red-300 hover:underline disabled:opacity-50"
          >
            Remover avaliação
          </button>
        )}
      </div>
      {(loading || saving) && (
        <p role="status" className="text-sm text-zinc-400">
          {loading ? "Carregando avaliação..." : "Salvando avaliação..."}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
