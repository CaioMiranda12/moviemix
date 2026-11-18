export function matchesListSearch(title: string, query: string) {
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  return normalize(title).includes(normalize(query.trim()));
}
