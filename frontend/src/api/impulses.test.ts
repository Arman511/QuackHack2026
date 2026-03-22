import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/api/http", () => ({
  apiRequest: vi.fn(),
  tokenStore: {
    setTokens: vi.fn(),
    clear: vi.fn(),
    getAccessToken: vi.fn().mockReturnValue(null),
    getRefreshToken: vi.fn().mockReturnValue(null),
  },
  refreshAccessToken: vi.fn().mockResolvedValue(null),
}));

import {
  getAllImpulses,
  getMyImpulses,
  replaceMyImpulses,
  createPossibleImpulse,
  removeMyPossibleImpulse,
  adminGetImpulses,
  adminCreateImpulse,
  adminPatchImpulse,
  adminRemoveImpulse,
  adminGetPossibleImpulses,
} from "@/api/impulses";
import { apiRequest } from "@/api/http";

const mockApiRequest = vi.mocked(apiRequest);

describe("impulses API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockResolvedValue([]);
  });

  it("getAllImpulses calls GET /api/impulses", async () => {
    await getAllImpulses();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/impulses");
  });

  it("getMyImpulses calls GET /api/impulses/me", async () => {
    await getMyImpulses();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/impulses/me");
  });

  it("replaceMyImpulses calls PUT /api/impulses/me", async () => {
    const body = { impulse_zone_ids: [1, 2] } as Parameters<typeof replaceMyImpulses>[0];
    await replaceMyImpulses(body);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/impulses/me",
      expect.objectContaining({ method: "PUT", body }),
    );
  });

  it("createPossibleImpulse calls POST /api/impulses/possible", async () => {
    const body = { name: "Gadgets" } as Parameters<typeof createPossibleImpulse>[0];
    await createPossibleImpulse(body);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/impulses/possible",
      expect.objectContaining({ method: "POST", body }),
    );
  });

  it("removeMyPossibleImpulse calls DELETE /api/impulses/possible/:id", async () => {
    await removeMyPossibleImpulse(4);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/impulses/possible/4",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("adminGetImpulses calls GET /api/impulses/admin/real", async () => {
    await adminGetImpulses();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/impulses/admin/real");
  });

  it("adminCreateImpulse calls POST /api/impulses/admin/real", async () => {
    const body = { name: "Coffee" } as Parameters<typeof adminCreateImpulse>[0];
    await adminCreateImpulse(body);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/impulses/admin/real",
      expect.objectContaining({ method: "POST", body }),
    );
  });

  it("adminPatchImpulse calls PATCH /api/impulses/admin/real/:id", async () => {
    const body = { name: "Updated" } as Parameters<typeof adminPatchImpulse>[1];
    await adminPatchImpulse(5, body);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/impulses/admin/real/5",
      expect.objectContaining({ method: "PATCH", body }),
    );
  });

  it("adminRemoveImpulse calls DELETE /api/impulses/admin/real/:id", async () => {
    await adminRemoveImpulse(3);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/impulses/admin/real/3",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("adminGetPossibleImpulses calls GET /api/impulses/admin/possible", async () => {
    await adminGetPossibleImpulses();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/impulses/admin/possible");
  });
});
