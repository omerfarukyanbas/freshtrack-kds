import { API_BASE } from "./config";
import { bearerAuthHeaders, fetchWithApiLog, readApiJson } from "./http";

export type RegisterPayload = {
  business_name: string;
  owner_name: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  business_name: string;
  owner_name: string;
  email: string;
  role: "normal_user" | "super_admin";
};

export type RegisterResponse = {
  message: string;
  business_name: string;
  owner_name: string;
  email: string;
  role: string;
};

/** Backend ile aynı (login 403 doğrulaması için). */
export const LOGIN_PENDING_APPROVAL_MSG =
  "Hesabınız yönetici onayı bekliyor." as const;

export type ProfileResponse = {
  business_name: string;
  owner_name: string;
  email: string;
  role: "normal_user" | "super_admin";
  phone: string | null;
  address: string | null;
  business_type: "market" | "bakkal" | "mini market";
  created_at: string;
  account_status: string;
};

export type UpdateProfilePayload = {
  business_name: string;
  owner_name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  business_type: "market" | "bakkal" | "mini market";
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetchWithApiLog(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readApiJson<T>(res, url);
}

export function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return postJson<RegisterResponse>("/auth/register", payload);
}

export function login(payload: LoginPayload): Promise<TokenResponse> {
  return postJson<TokenResponse>("/auth/login", payload);
}

export async function fetchProfile(): Promise<ProfileResponse> {
  const url = `${API_BASE}/auth/profile`;
  const res = await fetchWithApiLog(url, {
    headers: bearerAuthHeaders(),
  });
  return readApiJson<ProfileResponse>(res, url);
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
  const url = `${API_BASE}/auth/profile`;
  const res = await fetchWithApiLog(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...bearerAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return readApiJson<ProfileResponse>(res, url);
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  const url = `${API_BASE}/auth/change-password`;
  const res = await fetchWithApiLog(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...bearerAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return readApiJson<{ message: string }>(res, url);
}
