export type SortableListItem = {
  title: string;
  releaseDate: string;
  createdAt?: string;
  updatedAt?: string;
  score?: number;
  id: number;
  mediaType: string;
};

export type ListSortKey =
  | "title-asc"
  | "title-desc"
  | "release-newest"
  | "release-oldest"
  | "added-newest"
  | "added-oldest"
  | "updated-newest"
  | "updated-oldest"
  | "score-highest"
  | "score-lowest";

const collator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});

function compareDates(
  a: string | undefined,
  b: string | undefined,
  newest: boolean,
) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return newest ? b.localeCompare(a) : a.localeCompare(b);
}

export function sortListItems<T extends SortableListItem>(
  items: T[],
  sort: ListSortKey,
  getScore?: (item: T) => number | undefined,
): T[] {
  return [...items].sort((a, b) => {
    let result = 0;
    switch (sort) {
      case "title-asc":
        result = collator.compare(a.title, b.title);
        break;
      case "title-desc":
        result = collator.compare(b.title, a.title);
        break;
      case "release-newest":
        result = compareDates(a.releaseDate, b.releaseDate, true);
        break;
      case "release-oldest":
        result = compareDates(a.releaseDate, b.releaseDate, false);
        break;
      case "added-newest":
        result = compareDates(a.createdAt, b.createdAt, true);
        break;
      case "added-oldest":
        result = compareDates(a.createdAt, b.createdAt, false);
        break;
      case "updated-newest":
        result = compareDates(a.updatedAt, b.updatedAt, true);
        break;
      case "updated-oldest":
        result = compareDates(a.updatedAt, b.updatedAt, false);
        break;
      case "score-highest":
      case "score-lowest": {
        const aScore = getScore?.(a) ?? a.score;
        const bScore = getScore?.(b) ?? b.score;
        if (aScore === undefined && bScore !== undefined) result = 1;
        else if (bScore === undefined && aScore !== undefined) result = -1;
        else if (aScore !== undefined && bScore !== undefined) {
          result = sort === "score-highest" ? bScore - aScore : aScore - bScore;
        }
        break;
      }
    }
    return (
      result ||
      collator.compare(a.title, b.title) ||
      collator.compare(`${a.mediaType}-${a.id}`, `${b.mediaType}-${b.id}`)
    );
  });
}
