import { useEffect, useState } from "react";
import type { MediaType } from "../lib/catalog-api";
import { favoritesApi } from "../lib/favorites-api";

type Props = { mediaType: MediaType; id: number };

export function FavoriteButton({ mediaType, id }: Props) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    favoritesApi
      .list()
      .then((items) => {
        if (active)
          setSaved(
            items.some(
              (item) => item.id === id && item.mediaType === mediaType,
            ),
          );
      })
      .catch(() => {
        if (active) setError("Não foi possível consultar seus favoritos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mediaType, id]);

  async function toggle() {
    if (busy || loading) return;
    setBusy(true);
    setError("");
    try {
      if (saved) await favoritesApi.remove(mediaType, id);
      else await favoritesApi.add(mediaType, id);
      setSaved(!saved);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível atualizar sua lista.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={loading || busy || Boolean(error && loading)}
        aria-pressed={saved}
        className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
      >
        {loading
          ? "Consultando favoritos..."
          : busy
            ? "Salvando..."
            : saved
              ? "♥ Remover da Minha Lista"
              : "♡ Adicionar à Minha Lista"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
