import { describe, expect, it } from "vitest";
import { normalizeCitations, stripCitations } from "./citations";

describe("citation markers", () => {
  it("turns 【n†Lx-Ly】 into [n]", () => {
    expect(normalizeCitations("A 【4†L1-L5】 B 【2】 C")).toBe("A [4] B [2] C");
  });
  it("hides an unfinished marker", () => {
    expect(normalizeCitations("Typing 【4†L1")).toBe("Typing ");
  });
  it("leaves normal brackets alone", () => {
    expect(normalizeCitations("See [1] and arr[0]")).toBe("See [1] and arr[0]");
  });
  it("removes markers from previews", () => {
    expect(stripCitations("Fact 【4†L1-L5】 and [2] done")).toBe("Fact and done");
  });
});
