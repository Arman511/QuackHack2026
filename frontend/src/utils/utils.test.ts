import { describe, it, expect } from "vitest";
import { cn } from "@/utils/utils";

describe("cn", () => {
  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });

  it("combines class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters falsy values", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("p-4", "p-6")).toBe("p-6");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("handles conditional class objects", () => {
    expect(cn({ "font-bold": true, "font-normal": false })).toBe("font-bold");
  });

  it("handles array inputs", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });
});
