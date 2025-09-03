import { describe, it, expect } from "vitest";

function hpColor(ratio: number) {
  if (ratio > 0.66) return "green";
  if (ratio > 0.33) return "amber";
  return "red";
}

describe("hpColor", () => {
  it("green zone", () => expect(hpColor(0.9)).toBe("green"));
  it("amber zone", () => expect(hpColor(0.5)).toBe("amber"));
  it("red zone", () => expect(hpColor(0.1)).toBe("red"));
});