const TOKEN_KEY = "freshtrack_access_token";
const PROFILE_KEY = "freshtrack_profile";

export type StoredProfile = {
  business_name: string;
  owner_name: string;
  email: string;
  role?: "normal_user" | "super_admin";
  phone?: string;
  address?: string;
  business_type?: "market" | "bakkal" | "mini market";
  created_at?: string;
  account_status?: string;
  username?: string;
  preferences?: {
    notifications_enabled?: boolean;
    critical_skt_alerts?: boolean;
    overstock_alerts?: boolean;
    ai_suggestion_alerts?: boolean;
  };
};

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token: string, profile: StoredProfile): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export function getStoredProfile(): StoredProfile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredProfile;
  } catch {
    return null;
  }
}
