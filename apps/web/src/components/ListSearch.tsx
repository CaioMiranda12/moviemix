type ListSearchProps = { value: string; onChange: (value: string) => void };

export function ListSearch({ value, onChange }: ListSearchProps) {
  return (
    <div className="mt-6 max-w-md">
      <label htmlFor="list-search" className="mb-2 block text-sm text-zinc-300">
        Buscar na lista
      </label>
      <input
        id="list-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Digite o nome de um filme ou série"
        className="w-full rounded-xl border border-white/20 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
      />
    </div>
  );
}
