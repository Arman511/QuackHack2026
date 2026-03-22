import { describe, it, expect } from "vitest";
import {
  mockTransactions,
  mockPunishments,
  mockNotifications,
  impulseCategories,
  bankOptions,
  goalPresets,
  horseMessages,
} from "@/data/mockData";

describe("mockData", () => {
  describe("mockTransactions", () => {
    it("is a non-empty array", () => {
      expect(mockTransactions.length).toBeGreaterThan(0);
    });

    it("each item has required fields", () => {
      mockTransactions.forEach((tx) => {
        expect(tx).toHaveProperty("id");
        expect(tx).toHaveProperty("date");
        expect(tx).toHaveProperty("description");
        expect(tx).toHaveProperty("amount");
        expect(typeof tx.isImpulse).toBe("boolean");
      });
    });
  });

  describe("mockPunishments", () => {
    it("is a non-empty array", () => {
      expect(mockPunishments.length).toBeGreaterThan(0);
    });

    it("each item has required fields", () => {
      mockPunishments.forEach((p) => {
        expect(p).toHaveProperty("id");
        expect(p).toHaveProperty("transactionDesc");
        expect(p).toHaveProperty("punishment");
        expect(typeof p.transactionAmount).toBe("number");
      });
    });
  });

  describe("mockNotifications", () => {
    it("is a non-empty array", () => {
      expect(mockNotifications.length).toBeGreaterThan(0);
    });

    it("each item has a valid type", () => {
      const validTypes = ["impulse", "punishment", "savings", "info"];
      mockNotifications.forEach((n) => {
        expect(n).toHaveProperty("id");
        expect(n).toHaveProperty("title");
        expect(n).toHaveProperty("message");
        expect(validTypes).toContain(n.type);
      });
    });
  });

  describe("impulseCategories", () => {
    it("is a non-empty array of strings", () => {
      expect(impulseCategories.length).toBeGreaterThan(0);
      impulseCategories.forEach((c) => expect(typeof c).toBe("string"));
    });
  });

  describe("bankOptions", () => {
    it("has entries with name, color, and icon", () => {
      expect(bankOptions.length).toBeGreaterThan(0);
      bankOptions.forEach((b) => {
        expect(typeof b.name).toBe("string");
        expect(typeof b.color).toBe("string");
        expect(typeof b.icon).toBe("string");
      });
    });
  });

  describe("goalPresets", () => {
    it("has entries with name and icon", () => {
      expect(goalPresets.length).toBeGreaterThan(0);
      goalPresets.forEach((p) => {
        expect(typeof p.name).toBe("string");
        expect(typeof p.icon).toBe("string");
      });
    });
  });

  describe("horseMessages", () => {
    it("is a non-empty array of strings", () => {
      expect(horseMessages.length).toBeGreaterThan(0);
      horseMessages.forEach((m) => expect(typeof m).toBe("string"));
    });
  });
});
