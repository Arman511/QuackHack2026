import * as auth from "@/api/auth";
import * as users from "@/api/users";
import * as bank from "@/api/bank";
import * as impulses from "@/api/impulses";
import * as health from "@/api/health";

export { ApiError, apiRequest, refreshAccessToken, tokenStore } from "@/api/http";
export * from "@/api/types";

export const api = {
    auth,
    users,
    bank,
    impulses,
    health,
};
