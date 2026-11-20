import { describe, expect, it } from "vitest";
import { makeGreeting, partOfDay } from "./greeting";

const at = (h: number) => new Date(2026, 10, 20, h, 0, 0);

describe("partOfDay", () => {
  it("maps hours to the right part of the day", () => {
    expect(partOfDay(at(4))).toBe("night");
    expect(partOfDay(at(5))).toBe("morning");
    expect(partOfDay(at(11))).toBe("morning");
    expect(partOfDay(at(12))).toBe("afternoon");
    expect(partOfDay(at(16))).toBe("afternoon");
    expect(partOfDay(at(17))).toBe("evening");
    expect(partOfDay(at(20))).toBe("evening");
    expect(partOfDay(at(21))).toBe("night");
    expect(partOfDay(at(0))).toBe("night");
  });
});

describe("makeGreeting", () => {
  it("uses the name and a time-appropriate heading", () => {
    expect(makeGreeting("Sam", at(9), () => 0).heading).toBe("Good morning, Sam.");
    expect(makeGreeting("Sam", at(14), () => 0).heading).toBe("Good afternoon, Sam.");
    expect(makeGreeting("Sam", at(19), () => 0).heading).toBe("Good evening, Sam.");
    expect(makeGreeting("Sam", at(23), () => 0).heading).toBe("Working late, Sam?");
  });
  it("works without a name and always returns a quote", () => {
    const g = makeGreeting("", at(9), () => 0.99);
    expect(g.heading.endsWith(".")).toBe(true);
    expect(g.heading).not.toContain(",");
    expect(g.quote.text.length).toBeGreaterThan(5);
  });
  it("varies the quote with the random source", () => {
    const seen = new Set([0, 0.3, 0.6, 0.99].map((r) => makeGreeting("A", at(9), () => r).quote.text));
    expect(seen.size).toBeGreaterThan(1);
  });
});
