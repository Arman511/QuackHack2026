import { apiRequest } from "@/api/http";

export const healthCheck = () => apiRequest<Record<string, never>>("/api/health", { skipAuthRefresh: true });
