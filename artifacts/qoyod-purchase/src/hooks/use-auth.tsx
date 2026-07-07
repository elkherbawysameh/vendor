import React, { createContext, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { AuthUser, useGetCurrentUser, useLogin, useLogout, getGetCurrentUserQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const email = localStorage.getItem("auth_email");

  const { data: user, isLoading: isQueryLoading, error } = useGetCurrentUser({
    query: {
      enabled: !!email,
      retry: false,
      queryKey: getGetCurrentUserQueryKey(),
    },
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const isLoading = !!email && isQueryLoading;

  useEffect(() => {
    if (error || (!email && !isLoading)) {
      if (location.pathname !== "/login") {
        setLocation("/login");
      }
    }
  }, [error, email, isLoading, setLocation]);

  const login = async (loginEmail: string) => {
    try {
      await loginMutation.mutateAsync({ data: { email: loginEmail } });
      localStorage.setItem("auth_email", loginEmail);
      window.location.href = "/";
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      localStorage.removeItem("auth_email");
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
