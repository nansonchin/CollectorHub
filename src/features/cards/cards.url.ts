type CollectionFilters = {
  q?: string;
  element?: string;
  rarity?: string;
  page?: number;
  card?:number
};

export function collectionHref(filters: CollectionFilters = {}) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.element) params.set("element", filters.element);
  if (filters.rarity) params.set("rarity", filters.rarity);

  if (filters.page && filters.page > 1)
    params.set("page", String(filters.page));
   if (filters.card) params.set("card", String(filters.card));
  const queryString = params.toString();
  return queryString ? `/collection?${queryString}` : "/collection";
}
