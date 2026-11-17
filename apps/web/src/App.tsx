import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { authApi, type AuthUser } from "./lib/auth-api";

function AppRoutes() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    authApi
      .me()
      .then(({ user }) => {
        if (active) setUser(user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleLogin(authenticatedUser: AuthUser) {
    setUser(authenticatedUser);
    setLogoutError("");
    navigate("/", { replace: true });
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await authApi.logout();
      setUser(null);
      navigate("/login", { replace: true });
    } catch {
      setLogoutError("Não foi possível sair. Tente novamente.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Verificando sessão...</p>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <LoginForm onLogin={handleLogin} />
          )
        }
      />

      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <RegisterForm />}
      />

      <Route
        path="/"
        element={
          user ? (
            <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
              <header className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm font-semibold text-emerald-400">
                  MovieMix
                </p>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut ? "Saindo..." : "Sair"}
                </button>
              </header>

              <h1 className="mt-10 text-4xl font-bold">
                Bem-vindo ao MovieMix!
              </h1>

              <p className="mt-4 text-zinc-400">
                Você está autenticado como{" "}
                <span className="font-semibold text-white">{user.email}</span>.
              </p>

              <p className="mt-8 text-sm text-zinc-500">
                Sua biblioteca de filmes e séries estará disponível em breve.
              </p>

              {logoutError && (
                <p role="alert" className="mt-6 text-sm text-red-400">
                  {logoutError}
                </p>
              )}
            </main>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="*"
        element={<Navigate to={user ? "/" : "/login"} replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
