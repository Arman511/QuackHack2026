import { apiRequest, tokenStore } from "@/api/http";
import type {
    EmptyResponse,
    RefreshTokensCompatRequest,
    TokenPayload,
    UserLoginRequest,
    UserMePublic,
    UserPublic,
    UserRegisterRequest,
} from "@/api/types";

const persistTokenPair = (payload: TokenPayload): TokenPayload => {
    tokenStore.setTokens(payload);
    return payload;
};

export const register = (body: UserRegisterRequest) =>
    apiRequest<UserPublic>("/api/auth/register", {
        method: "POST",
        body,
        skipAuthRefresh: true,
    });

export const login = async (body: UserLoginRequest) =>
    persistTokenPair(
        await apiRequest<TokenPayload>("/api/auth/login", {
            method: "POST",
            body,
            skipAuthRefresh: true,
        }),
    );

export const loginOauth2Compat = async (username: string, password: string, scope = "") => {
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", password);
    form.set("scope", scope);

    return persistTokenPair(
        await apiRequest<TokenPayload>("/api/auth/token", {
            method: "POST",
            form,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            skipAuthRefresh: true,
        }),
    );
};

export const me = () => apiRequest<UserMePublic>("/api/auth/me");

export const listUsernames = () => apiRequest<string[]>("/api/auth/users");

export const refreshTokens = async () =>
    persistTokenPair(
        await apiRequest<TokenPayload>("/api/auth/refresh", {
            method: "POST",
            skipAuthRefresh: true,
            retryOn401: false,
        }),
    );

export const refreshTokensCompat = async (body: RefreshTokensCompatRequest) =>
    persistTokenPair(
        await apiRequest<TokenPayload>("/api/auth/refresh/token", {
            method: "POST",
            body,
            skipAuthRefresh: true,
            retryOn401: false,
        }),
    );

export const logout = async () => {
    const result = await apiRequest<EmptyResponse>("/api/auth/logout", {
        method: "POST",
        skipAuthRefresh: true,
        retryOn401: false,
    });
    tokenStore.clear();
    return result;
};

export const logoutDeleteCompat = async () => {
    const result = await apiRequest<EmptyResponse>("/api/auth/logout", {
        method: "DELETE",
        skipAuthRefresh: true,
        retryOn401: false,
    });
    tokenStore.clear();
    return result;
};
