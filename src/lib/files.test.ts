import { describe, expect, it } from "vitest";
import { validateFile } from "./files";

describe("validateFile", () => {
  it("accepts a 1 MB PDF", () => expect(validateFile({ name: "a.pdf", size: 1e6 }, 0)).toBeNull());
  it("rejects unsupported types", () => expect(validateFile({ name: "a.exe", size: 10 }, 0)).not.toBeNull());
  it("rejects files over 20 MB", () => expect(validateFile({ name: "a.csv", size: 20 * 1024 * 1024 + 1 }, 0)).not.toBeNull());
  it("rejects a 6th file", () => expect(validateFile({ name: "a.png", size: 10 }, 5)).not.toBeNull());
  it("allows a 5th file", () => expect(validateFile({ name: "a.png", size: 10 }, 4)).toBeNull());
});
