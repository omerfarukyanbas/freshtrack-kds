import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "../api/auth";
import {
  clearStoredAuth,
  getStoredProfile,
  getStoredToken,
  setStoredAuth,
  type StoredProfile,
} from "./storage";

type AuthContextValue = {
  token: string | null;
  profile: StoredProfile | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<authApi.RegisterResponse>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = getStoredToken();
    const p = getStoredProfile();
    setToken(t);
    setProfile(p);
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setStoredAuth(res.access_token, {
      business_name: res.business_name,
      owner_name: res.owner_name,
      email: res.email,
      role: res.role,
    });
    setToken(res.access_token);
    setProfile({
      business_name: res.business_name,
      owner_name: res.owner_name,
      email: res.email,
      role: res.role,
    });
  }, []);

  const register = useCallback(async (payload: authApi.RegisterPayload) => {
    return authApi.register(payload);
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      profile,
      ready,
      login,
      register,
      logout,
    }),
    [token, profile, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
