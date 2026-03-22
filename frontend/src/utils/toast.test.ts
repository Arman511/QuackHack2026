import { describe, it, expect } from "vitest";
import { toast } from "@/utils/toast";

describe("toast", () => {
  it("re-exports toast from sonner as a function", () => {
    expect(typeof toast).toBe("function");
  });
});
