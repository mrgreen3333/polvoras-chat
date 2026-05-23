import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { generateKeyPair } from "@/utils/crypto";
import { tokenBus } from "@/utils/tokenBus";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export type UserStatus = "online" | "away" | "offline";

export type User = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUri?: string;
  status: UserStatus;
  inviteCode: string;
  publicKey: string;
  notifications: boolean;
  showReadReceipts: boolean;
  autoDeleteMessages: boolean;
  language: string;
  createdAt: number;
};

type RegisterData = { username: string; displayName: string; password: string };

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  findUserByInviteCode: (code: string) => Promise<User | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const KEYS = {
  USER: "@polv_user",
  TOKEN: "@polv_token",
  SECRET_KEY: "@polv_secret_key",
};

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

function genInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PLVR-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function apiFetch(path: string, opts?: RequestInit & { token?: string }): Promise<Response> {
  const { token, ...rest } = opts ?? {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((rest.headers as Record<string, string>) ?? {}),
  };
  return fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedUser, storedToken] = await Promise.all([
          AsyncStorage.getItem(KEYS.USER),
          AsyncStorage.getItem(KEYS.TOKEN),
        ]);
        if (storedUser) setUser(JSON.parse(storedUser) as User);
        if (storedToken) {
          setToken(storedToken);
          tokenBus.emit(storedToken);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistUser = useCallback(async (u: User, t: string) => {
    await Promise.all([
      AsyncStorage.setItem(KEYS.USER, JSON.stringify(u)),
      AsyncStorage.setItem(KEYS.TOKEN, t),
    ]);
    setUser(u);
    setToken(t);
    tokenBus.emit(t);
  }, []);

  async function register(data: RegisterData) {
    if (data.username.trim().length < 3)
      return { success: false, error: "Username deve ter pelo menos 3 caracteres" };
    if (data.password.length < 6)
      return { success: false, error: "Senha deve ter pelo menos 6 caracteres" };

    const keypair = generateKeyPair();
    await AsyncStorage.setItem(KEYS.SECRET_KEY, keypair.secretKey);

    try {
      const resp = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: data.username.trim().toLowerCase(),
          displayName: data.displayName.trim() || data.username.trim(),
          password: data.password,
          publicKey: keypair.publicKey,
        }),
      });
      const json = (await resp.json()) as { token?: string; user?: User; error?: string };
      if (!resp.ok) return { success: false, error: json.error ?? "Erro ao criar conta" };
      const newUser: User = {
        ...(json.user as User),
        notifications: true,
        showReadReceipts: true,
        autoDeleteMessages: false,
        language: "pt",
      };
      await persistUser(newUser, json.token!);
      return { success: true };
    } catch {
      // Local fallback when server is unavailable
      const fallbackUser: User = {
        id: genId(),
        username: data.username.trim().toLowerCase(),
        displayName: data.displayName.trim() || data.username.trim(),
        bio: "",
        status: "online",
        inviteCode: genInviteCode(),
        publicKey: keypair.publicKey,
        notifications: true,
        showReadReceipts: true,
        autoDeleteMessages: false,
        language: "pt",
        createdAt: Date.now(),
      };
      const localToken = `local_${genId()}`;
      await persistUser(fallbackUser, localToken);
      return { success: true };
    }
  }

  async function login(username: string, password: string) {
    try {
      const resp = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      const json = (await resp.json()) as { token?: string; user?: User; error?: string };
      if (!resp.ok) return { success: false, error: json.error ?? "Erro ao fazer login" };
      const loggedUser: User = {
        ...(json.user as User),
        notifications: user?.notifications ?? true,
        showReadReceipts: user?.showReadReceipts ?? true,
        autoDeleteMessages: user?.autoDeleteMessages ?? false,
        language: user?.language ?? "pt",
      };
      await persistUser(loggedUser, json.token!);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Servidor indisponível. Verifica a tua ligação à internet.",
      };
    }
  }

  async function logout() {
    tokenBus.emit(null);
    await AsyncStorage.multiRemove([KEYS.USER, KEYS.TOKEN]);
    setUser(null);
    setToken(null);
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(updated));
    setUser(updated);
    if (token && !token.startsWith("local_")) {
      try {
        await apiFetch("/users/me", {
          method: "PATCH",
          token,
          body: JSON.stringify(updates),
        });
      } catch {}
    }
  }

  async function findUserByInviteCode(code: string): Promise<User | null> {
    if (!token) return null;
    try {
      const resp = await apiFetch(`/users/find?code=${encodeURIComponent(code)}`, { token });
      if (!resp.ok) return null;
      return (await resp.json()) as User;
    } catch {
      return null;
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, token, login, register, logout, updateProfile, findUserByInviteCode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
