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
  updateMyProfile,
  setMyGoal,
  getMyLimitStatus,
  getMyPossibleImpulses,
  getUser,
  patchUserAsAdmin,
} from "@/api/users";
import { apiRequest } from "@/api/http";

const mockApiRequest = vi.mocked(apiRequest);

describe("users API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockResolvedValue({});
  });

  it("updateMyProfile calls PUT /api/users/me", async () => {
    const body = { full_name: "Test User" } as Parameters<typeof updateMyProfile>[0];
    await updateMyProfile(body);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/users/me",
      expect.objectContaining({ method: "PUT", body }),
    );
  });

  it("setMyGoal calls POST /api/users/me/goal", async () => {
    const body = { goal: 500 } as Parameters<typeof setMyGoal>[0];
    await setMyGoal(body);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/users/me/goal",
      expect.objectContaining({ method: "POST", body }),
    );
  });

  it("getMyLimitStatus calls GET /api/users/me/is-passed-limit", async () => {
    await getMyLimitStatus();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/users/me/is-passed-limit");
  });

  it("getMyPossibleImpulses calls GET /api/users/me/possible-impulses", async () => {
    await getMyPossibleImpulses();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/users/me/possible-impulses");
  });

  it("getUser calls GET /api/users/:id", async () => {
    await getUser(42);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/users/42");
  });

  it("patchUserAsAdmin calls PATCH /api/users/:id", async () => {
    const body = { is_active: false } as Parameters<typeof patchUserAsAdmin>[1];
    await patchUserAsAdmin(7, body);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/users/7",
      expect.objectContaining({ method: "PATCH", body }),
    );
  });
});
