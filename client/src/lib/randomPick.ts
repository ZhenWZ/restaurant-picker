export type WeightedItem = {
  weight: number;
};

export function selectWeightedRandom<T extends WeightedItem>(
  items: T[],
  random = Math.random,
) {
  if (items.length === 0) {
    throw new Error("Cannot select from an empty list");
  }

  const totalWeight = items.reduce((sum, item) => sum + Math.max(item.weight, 0), 0);
  if (totalWeight <= 0) return items[items.length - 1];

  let target = random() * totalWeight;
  for (const item of items) {
    target -= Math.max(item.weight, 0);
    if (target <= 0) return item;
  }

  return items[items.length - 1];
}
