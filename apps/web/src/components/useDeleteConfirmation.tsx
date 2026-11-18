import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Request = { title: string; description: string; confirmLabel: string };

/** A confirmation is resolved only by an explicit click on the destructive button. */
export function useDeleteConfirmation() {
  const [request, setRequest] = useState<Request | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setRequest(null);
    trigger.current?.focus();
  }, []);

  function confirmDelete(
    title: string,
    description: string,
    confirmLabel = "Excluir",
  ) {
    if (resolver.current) return Promise.resolve(false);
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setRequest({ title, description, confirmLabel });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }

  useEffect(() => {
    if (!request) return;
    cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      }
      if (event.key === "Tab") {
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [request, close]);

  useEffect(
    () => () => {
      resolver.current?.(false);
      resolver.current = null;
    },
    [],
  );

  const confirmationDialog =
    request &&
    createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) close(false);
        }}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          aria-describedby="delete-confirm-description"
          className="w-full max-w-md rounded-2xl border border-white/15 bg-zinc-900 p-5 text-zinc-100 shadow-2xl sm:p-6"
        >
          <h2 id="delete-confirm-title" className="text-xl font-bold">
            {request.title}
          </h2>
          <p
            id="delete-confirm-description"
            className="mt-3 text-sm leading-relaxed text-zinc-300"
          >
            {request.description}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              ref={cancelRef}
              type="button"
              onClick={() => close(false)}
              className="rounded-lg border border-white/25 px-4 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              Cancelar
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={() => close(true)}
              className="rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-white"
            >
              {request.confirmLabel}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  return { confirmDelete, confirmationDialog };
}
