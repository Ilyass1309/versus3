import { describe, it, expect } from "vitest";

function choose(epsilon: number, greedy: number, randomFn: () => number = Math.random) {
  if (randomFn() < epsilon) return (Math.random() * 3) | 0;
  return greedy;
}

describe("epsilon greedy", () => {
  it("returns greedy when random above epsilon", () => {
    const r = choose(0.1, 2, () => 0.9);
    expect(r).toBe(2);
  });
  it("returns random when below epsilon", () => {
    const r = choose(0.5, 2, () => 0.2);
    expect([0,1,2]).toContain(r);
  });
});