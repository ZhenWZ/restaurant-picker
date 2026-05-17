import { describe, expect, it } from "vitest";
import { selectWeightedRandom } from "./randomPick";

describe("selectWeightedRandom", () => {
  it("selects based on deterministic random input", () => {
    const items = [
      { id: "a", weight: 1 },
      { id: "b", weight: 3 },
      { id: "c", weight: 6 },
    ];

    expect(selectWeightedRandom(items, () => 0.05).id).toBe("a");
    expect(selectWeightedRandom(items, () => 0.35).id).toBe("b");
    expect(selectWeightedRandom(items, () => 0.95).id).toBe("c");
  });

  it("rejects empty lists", () => {
    expect(() => selectWeightedRandom([], () => 0)).toThrow("Cannot select from an empty list");
  });
});
