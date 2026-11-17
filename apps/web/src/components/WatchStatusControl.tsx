import { useEffect, useState } from "react";
import type { MediaType } from "../lib/catalog-api";
import {
  watchStatusApi,
  watchStatusLabels,
  type WatchStatus,
} from "../lib/watch-status-api";

type Props = { mediaType: MediaType; id: number };

export function WatchStatusControl({ mediaType, id }: Props) {
  const [status, setStatus] = useState<WatchStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    watchStatusApi
      .list()
      .then((items) => {
        if (active)
          setStatus(
            items.find((item) => item.id === id && item.mediaType === mediaType)
              ?.status ?? "",
          );
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o status.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mediaType, id]);

  async function change(next: string) {
    if (saving || loading) return;
    setSaving(true);
    setError("");
    try {
      if (next === "") {
        await watchStatusApi.remove(mediaType, id);
      } else {
        await watchStatusApi.set(mediaType, id, next as WatchStatus);
      }
      setStatus(next as WatchStatus | "");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar o status.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 space-y-2">
      <label
        htmlFor="watch-status"
        className="block text-sm font-medium text-zinc-200"
      >
        Meu acompanhamento
      </label>
      <select
        id="watch-status"
        value={status}
        disabled={loading || saving}
        onChange={(event) => void change(event.target.value)}
        className="w-full max-w-xs rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-zinc-100 disabled:opacity-60"
      >
        <option value="">Sem status</option>
        {(Object.keys(watchStatusLabels) as WatchStatus[]).map((value) => (
          <option key={value} value={value}>
            {watchStatusLabels[value]}
          </option>
        ))}
      </select>
      {loading && (
        <p role="status" className="text-sm text-zinc-400">
          Carregando status...
        </p>
      )}
      {saving && (
        <p role="status" className="text-sm text-zinc-400">
          Salvando status...
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
