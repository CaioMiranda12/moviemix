import { PlaylistDetailsPage } from "./components/PlaylistDetailsPage";
import { PlaylistsPage } from "./components/PlaylistsPage";
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { MobileNavigation } from "./components/MobileNavigation";
import { LoginForm } from "./components/LoginForm";
import { CatalogPage } from "./components/CatalogPage";
import { ProfilePage } from "./components/ProfilePage";
import { RatingsPage } from "./components/RatingsPage";
import { WatchStatusPage } from "./components/WatchStatusPage";
import { FavoritesPage } from "./components/FavoritesPage";
import { TitleDetailsPage } from "./components/TitleDetailsPage";
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
    <>
      {user && <MobileNavigation />}
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
              <CatalogPage
                email={user.email}
                onLogout={handleLogout}
                loggingOut={loggingOut}
                logoutError={logoutError}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/lists"
          element={user ? <PlaylistsPage /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/lists/:id"
          element={
            user ? <PlaylistDetailsPage /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/my-list"
          element={user ? <FavoritesPage /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/watching"
          element={
            user ? <WatchStatusPage /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/profile"
          element={
            user ? (
              <ProfilePage email={user.email} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/ratings"
          element={user ? <RatingsPage /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/:mediaType/:id"
          element={
            user ? <TitleDetailsPage /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="*"
          element={<Navigate to={user ? "/" : "/login"} replace />}
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
