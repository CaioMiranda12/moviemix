import { useState, type FormEvent } from "react";
import { authApi, AuthApiError, type AuthUser } from "../lib/auth-api";
import { Link, useLocation } from "react-router-dom";

type LoginFormProps = {
  onLogin: (user: AuthUser) => void;
};

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const registered = location.state?.registered === true;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authApi.login(email, password);
      onLogin(result.user);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 401) {
        setError("E-mail ou senha incorretos.");
      } else if (err instanceof AuthApiError && err.status === 429) {
        setError("Muitas tentativas. Aguarde um minuto.");
      } else {
        setError("Não foi possível entrar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="mb-3 text-sm font-semibold text-emerald-400">MovieMix</p>

        <h1 className="text-3xl font-bold">Entre na sua conta</h1>

        <p className="mt-3 text-sm text-zinc-400">
          Suas próximas histórias começam aqui.
        </p>

        {registered && (
          <p role="status" className="mt-6 text-sm text-emerald-400">
            Conta criada com sucesso! Faça login para continuar.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              E-mail
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="voce@exemplo.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Senha
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="Sua senha"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Ainda não tem uma conta?{" "}
          <Link to="/register" className="font-semibold text-emerald-400">
            Cadastre-se
          </Link>
        </p>
      </section>
    </main>
  );
}
