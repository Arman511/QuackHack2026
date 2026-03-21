import { apiRequest } from "@/api/http";
import type {
  EmptyResponse,
  ImpulseZoneCreate,
  ImpulseZonePublic,
  ImpulseZoneUpdate,
  PossibleImpulseZonePublic,
  PromotePossibleImpulseRequest,
  UserImpulseSetRequest,
  UserImpulsesBundlePublic,
} from "@/api/types";

export const getAllImpulses = () => apiRequest<ImpulseZonePublic[]>("/api/impulses");

export const getMyImpulses = () => apiRequest<UserImpulsesBundlePublic>("/api/impulses/me");

export const replaceMyImpulses = (body: UserImpulseSetRequest) =>
  apiRequest<UserImpulsesBundlePublic>("/api/impulses/me", {
    method: "PUT",
    body,
  });

export const createPossibleImpulse = (body: ImpulseZoneCreate) =>
  apiRequest<PossibleImpulseZonePublic>("/api/impulses/possible", {
    method: "POST",
    body,
  });

export const adminGetImpulses = () => apiRequest<ImpulseZonePublic[]>("/api/impulses/admin/real");

export const adminCreateImpulse = (body: ImpulseZoneCreate) =>
  apiRequest<ImpulseZonePublic>("/api/impulses/admin/real", {
    method: "POST",
    body,
  });

export const adminPatchImpulse = (zoneId: number, body: ImpulseZoneUpdate) =>
  apiRequest<ImpulseZonePublic>(`/api/impulses/admin/real/${zoneId}`, {
    method: "PATCH",
    body,
  });

export const adminRemoveImpulse = (zoneId: number) =>
  apiRequest<EmptyResponse>(`/api/impulses/admin/real/${zoneId}`, {
    method: "DELETE",
  });

export const adminGetPossibleImpulses = () =>
  apiRequest<PossibleImpulseZonePublic[]>("/api/impulses/admin/possible");

export const adminCreatePossibleImpulse = (body: ImpulseZoneCreate) =>
  apiRequest<PossibleImpulseZonePublic>("/api/impulses/admin/possible", {
    method: "POST",
    body,
  });

export const adminPatchPossibleImpulse = (zoneId: number, body: ImpulseZoneUpdate) =>
  apiRequest<PossibleImpulseZonePublic>(`/api/impulses/admin/possible/${zoneId}`, {
    method: "PATCH",
    body,
  });

export const adminRemovePossibleImpulse = (zoneId: number) =>
  apiRequest<EmptyResponse>(`/api/impulses/admin/possible/${zoneId}`, {
    method: "DELETE",
  });

export const adminPromotePossibleImpulse = (zoneId: number, body: PromotePossibleImpulseRequest) =>
  apiRequest<ImpulseZonePublic>(`/api/impulses/admin/possible/${zoneId}/promote`, {
    method: "POST",
    body,
  });
