export type SortOption = { value: string; label: string };

type ListSortProps = {
  value: string;
  onChange: (value: string) => void;
  options: SortOption[];
};

export function ListSort({ value, onChange, options }: ListSortProps) {
  return (
    <div className="w-full max-w-xs">
      <label htmlFor="list-sort" className="mb-2 block text-sm text-zinc-300">
        Ordenar por
      </label>
      <select
        id="list-sort"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/20 bg-zinc-900 px-4 py-3 text-white focus:border-emerald-400 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
