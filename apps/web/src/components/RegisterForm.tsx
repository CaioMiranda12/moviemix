import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, AuthApiError } from "../lib/auth-api";

export function RegisterForm() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      await authApi.register(email, password);

      navigate("/login", {
        replace: true,
        state: { registered: true },
      });
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 409) {
        setError("Este e-mail já está cadastrado.");
      } else if (err instanceof AuthApiError && err.status === 400) {
        setError("Verifique o e-mail e os requisitos da senha.");
      } else if (err instanceof AuthApiError && err.status === 429) {
        setError("Muitas tentativas. Aguarde e tente novamente.");
      } else {
        setError("Não foi possível criar a conta. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="mb-3 text-sm font-semibold text-emerald-400">MovieMix</p>

        <h1 className="text-3xl font-bold">Crie sua conta</h1>

        <p className="mt-3 text-sm text-zinc-400">
          Comece a organizar suas próximas histórias.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="register-email" className="mb-2 block text-sm">
              E-mail
            </label>

            <input
              id="register-email"
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
            <label htmlFor="register-password" className="mb-2 block text-sm">
              Senha
            </label>

            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="Mínimo de 12 caracteres"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm">
              Confirmar senha
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="Repita sua senha"
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
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Já tem uma conta?{" "}
          <Link to="/login" className="font-semibold text-emerald-400">
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}
