const upcoming = [
  { label: "Explorar filmes e séries", sprint: "Sprint 1" },
  { label: "Criar suas playlists", sprint: "Sprint 2" },
  { label: "Organizar sua biblioteca", sprint: "Sprint 3" },
  { label: "Descobrir mixes personalizados", sprint: "Sprint 4" },
];

export default function App() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-14 sm:py-24">
      <div className="mb-10 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
        MovieMix · Sprint 0
      </div>
      <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-7xl">
        Sua próxima história começa aqui.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
        Descubra, organize e compartilhe filmes e séries em playlists do seu
        jeito. Estamos construindo a base do MovieMix.
      </p>
      <section
        className="mt-14 grid gap-4 sm:grid-cols-2"
        aria-label="Próximas entregas"
      >
        {upcoming.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
              {item.sprint}
            </p>
            <h2 className="mt-3 text-xl font-semibold">{item.label}</h2>
          </article>
        ))}
      </section>
    </main>
  );
}
