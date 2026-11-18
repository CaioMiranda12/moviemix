import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { playlistsApi } from "../lib/playlists-api";

/** A single creation flow shared by mobile and desktop navigation. */
export function QuickCreatePlaylist({ mobile = false }: { mobile?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!creating) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    inputRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [creating]);

  function close() {
    if (busy) return;
    setCreating(false);
    setName("");
    setError("");
    setMenuOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 80 || busy) return;
    setBusy(true);
    setError("");
    try {
      const playlist = await playlistsApi.create(trimmed);
      setCreating(false);
      setMenuOpen(false);
      setName("");
      navigate(`/lists/${playlist.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível criar a lista.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        className={
          mobile
            ? "relative flex items-center justify-center"
            : "fixed bottom-8 right-8 z-40 hidden flex-col items-end gap-3 md:flex"
        }
      >
        <div
          id={mobile ? "quick-create-mobile-menu" : "quick-create-desktop-menu"}
          aria-hidden={!menuOpen}
          className={
            mobile
              ? `fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 rounded-t-3xl border-t border-white/15 bg-zinc-900 px-4 py-5 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] transition-all duration-250 ease-out motion-reduce:transition-none ${menuOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`
              : `mb-1 origin-bottom-right transition-all duration-200 motion-reduce:transition-none ${menuOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`
          }
        >
          <button
            type="button"
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => {
              setMenuOpen(false);
              setCreating(true);
            }}
            className={
              mobile
                ? "flex min-h-16 w-full items-center gap-4 rounded-2xl bg-zinc-800 px-5 py-4 text-left text-base font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-emerald-400"
                : "whitespace-nowrap rounded-2xl border border-white/20 bg-zinc-800 px-5 py-4 text-sm font-semibold text-white shadow-2xl hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-emerald-400"
            }
          >
            <span
              aria-hidden="true"
              className={
                mobile
                  ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xl"
                  : "mr-2"
              }
            >
              ▤
            </span>
            Nova lista
          </button>
        </div>
        <button
          ref={triggerRef}
          type="button"
          aria-label={
            menuOpen ? "Fechar menu de criação" : "Abrir menu de criação"
          }
          aria-expanded={menuOpen}
          aria-controls={
            mobile ? "quick-create-mobile-menu" : "quick-create-desktop-menu"
          }
          onClick={() => setMenuOpen((value) => !value)}
          className={`${mobile ? "h-12 w-12" : "h-14 w-14 shadow-xl"} flex shrink-0 items-center justify-center rounded-full bg-white text-zinc-950 transition-transform duration-200 hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="block shrink-0"
          >
            {menuOpen ? (
              <path d="M5 5l14 14M19 5L5 19" />
            ) : (
              <path d="M12 5v14M5 12h14" />
            )}
          </svg>
        </button>
      </div>
      {creating && (
        <dialog
          ref={dialogRef}
          aria-labelledby="quick-create-title"
          onCancel={(event) => {
            if (busy) event.preventDefault();
            else close();
          }}
          onClose={() => {
            if (!busy) close();
          }}
          className="fixed inset-0 m-auto w-[min(100%-2rem,36rem)] max-h-[90dvh] overflow-y-auto rounded-2xl border border-white/15 bg-zinc-900 p-6 text-white shadow-2xl backdrop:bg-black/80 sm:p-10"
        >
          <form
            onSubmit={(event) => void create(event)}
            className="flex flex-col items-center gap-8 text-center"
          >
            <h2
              id="quick-create-title"
              className="text-2xl font-bold sm:text-3xl"
            >
              Dê um nome à sua lista
            </h2>
            <div className="w-full">
              <label htmlFor="quick-create-name" className="sr-only">
                Nome da nova lista
              </label>
              <input
                ref={inputRef}
                id="quick-create-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                placeholder="Minha lista"
                className="w-full border-b-2 border-white/40 bg-transparent px-2 py-4 text-center text-3xl font-bold text-white outline-none placeholder:text-zinc-500 focus:border-emerald-400 sm:text-4xl"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-4">
              <button
                type="button"
                disabled={busy}
                onClick={close}
                className="rounded-full border border-white/30 px-7 py-3 font-bold hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="rounded-full bg-emerald-500 px-8 py-3 font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {busy ? "Criando..." : "Criar"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
