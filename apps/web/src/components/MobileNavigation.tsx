import { NavLink } from "react-router-dom";

const destinations = [
  { to: "/", label: "Explorar", symbol: "⌕", end: true },
  { to: "/my-list", label: "Favoritos", symbol: "♥" },
  { to: "/ratings", label: "Notas", symbol: "★" },
  { to: "/watching", label: "Assistindo", symbol: "◷" },
  { to: "/profile", label: "Mais", symbol: "☰" },
];

/** Navegação principal acessível ao polegar, apenas para usuários autenticados. */
export function MobileNavigation() {
  return (
    <nav
      aria-label="Navegação principal mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {destinations.map(({ to, label, symbol, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-emerald-400 ${isActive ? "text-emerald-400" : "text-zinc-300 hover:text-white"}`
            }
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                <span aria-hidden="true" className="text-xl leading-6">
                  {symbol}
                </span>
                <span>{label}</span>
                {isActive && <span className="sr-only"> (página atual)</span>}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
