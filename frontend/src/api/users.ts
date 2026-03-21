import { apiRequest } from "@/api/http";
import type {
    PossibleImpulseZonePublic,
    UserAdminPatch,
    UserGoalSetRequest,
    UserLimitStatusPublic,
    UserMetadataPublic,
    UserRead,
    UserUpdate,
} from "@/api/types";

export const updateMyProfile = (body: UserUpdate) =>
    apiRequest<UserRead>("/api/users/me", {
        method: "PUT",
        body,
    });

export const setMyGoal = (body: UserGoalSetRequest) =>
    apiRequest<UserMetadataPublic>("/api/users/me/goal", {
        method: "POST",
        body,
    });

export const getMyLimitStatus = () => apiRequest<UserLimitStatusPublic>("/api/users/me/is-passed-limit");

export const getMyPossibleImpulses = () =>
    apiRequest<PossibleImpulseZonePublic[]>("/api/users/me/possible-impulses");

export const getUser = (userId: number) => apiRequest<UserRead>(`/api/users/${userId}`);

export const patchUserAsAdmin = (userId: number, body: UserAdminPatch) =>
    apiRequest<UserRead>(`/api/users/${userId}`, {
        method: "PATCH",
        body,
    });
