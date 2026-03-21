import type { TokenPayload } from "@/api/types";

const getApiBaseUrl = (): string => {
    const meta = import.meta as ImportMeta & {
        env?: { VITE_API_BASE_URL?: string };
    };
    return meta.env?.VITE_API_BASE_URL?.trim() || "";
};

const API_BASE_URL = getApiBaseUrl();

const ACCESS_TOKEN_KEY = "qh_access_token";
const REFRESH_TOKEN_KEY = "qh_refresh_token";
const REFRESH_THRESHOLD_SECONDS = 120;

let inflightRefresh: Promise<TokenPayload | null> | null = null;

export class ApiError extends Error {
    public readonly status: number;
    public readonly body: unknown;

    constructor(status: number, message: string, body: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.body = body;
    }
}

export interface RequestOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    headers?: Record<string, string>;
    form?: URLSearchParams;
    skipAuthRefresh?: boolean;
    retryOn401?: boolean;
}

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const parseJwtExpirationMs = (jwt?: string | null): number | null => {
    if (!jwt) {
        return null;
    }

    const parts = jwt.split(".");
    if (parts.length !== 3) {
        return null;
    }

    try {
        const payload = JSON.parse(atob(parts[1]));
        if (typeof payload.exp !== "number") {
            return null;
        }
        return payload.exp * 1000;
    } catch {
        return null;
    }
};

export const tokenStore = {
    getAccessToken(): string | null {
        return canUseStorage() ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null;
    },
    getRefreshToken(): string | null {
        return canUseStorage() ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    },
    setTokens(payload: Pick<TokenPayload, "access_token" | "refresh_token">) {
        if (!canUseStorage()) {
            return;
        }
        window.localStorage.setItem(ACCESS_TOKEN_KEY, payload.access_token);
        window.localStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh_token);
    },
    clear() {
        if (!canUseStorage()) {
            return;
        }
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
};

const resolveUrl = (path: string) => `${API_BASE_URL}${path}`;

const maybeParseJson = async (response: Response) => {
    const text = await response.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

const shouldRefreshNow = (): boolean => {
    const expMs = parseJwtExpirationMs(tokenStore.getAccessToken());
    if (!expMs) {
        return false;
    }
    return expMs - Date.now() <= REFRESH_THRESHOLD_SECONDS * 1000;
};

const doRefresh = async (): Promise<TokenPayload | null> => {
    const refreshToken = tokenStore.getRefreshToken();
    const accessToken = tokenStore.getAccessToken();

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    // Try cookie-based refresh first, then compat body-based refresh.
    const cookieRefreshResponse = await fetch(resolveUrl("/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers,
    });

    if (cookieRefreshResponse.ok) {
        const payload = (await maybeParseJson(cookieRefreshResponse)) as TokenPayload;
        tokenStore.setTokens(payload);
        return payload;
    }

    if (!refreshToken) {
        tokenStore.clear();
        return null;
    }

    const compatResponse = await fetch(resolveUrl("/api/auth/refresh/token"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken, access_token: accessToken }),
    });

    if (!compatResponse.ok) {
        tokenStore.clear();
        return null;
    }

    const payload = (await maybeParseJson(compatResponse)) as TokenPayload;
    tokenStore.setTokens(payload);
    return payload;
};

export const refreshAccessToken = async (force = false): Promise<TokenPayload | null> => {
    if (!force && !shouldRefreshNow()) {
        return null;
    }

    if (!inflightRefresh) {
        inflightRefresh = doRefresh().finally(() => {
            inflightRefresh = null;
        });
    }

    return inflightRefresh;
};

const buildHeaders = (options: RequestOptions): Record<string, string> => {
    const headers: Record<string, string> = {
        Accept: "application/json",
        ...options.headers,
    };

    if (options.form) {
        return headers;
    }

    if (options.body !== undefined && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const accessToken = tokenStore.getAccessToken();
    if (accessToken && !headers.Authorization) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    return headers;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const { retryOn401 = true, skipAuthRefresh = false } = options;

    if (!skipAuthRefresh) {
        await refreshAccessToken(false);
    }

    const response = await fetch(resolveUrl(path), {
        method: options.method || "GET",
        credentials: "include",
        headers: buildHeaders(options),
        body: options.form ? options.form.toString() : options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (response.status === 401 && retryOn401 && !skipAuthRefresh) {
        const refreshed = await refreshAccessToken(true);
        if (refreshed) {
            return apiRequest<T>(path, { ...options, retryOn401: false });
        }
    }

    const parsed = await maybeParseJson(response);

    if (!response.ok) {
        const message = typeof parsed === "object" && parsed !== null && "detail" in parsed
            ? String((parsed as { detail: unknown }).detail)
            : `Request failed with status ${response.status}`;
        throw new ApiError(response.status, message, parsed);
    }

    return (parsed ?? {}) as T;
};
