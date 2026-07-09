import React, { createContext, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { AuthUser, useGetCurrentUser, useLogout, getGetCurrentUserQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: async () => {},
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentLocation, setLocation] = useLocation();

  const { data: user, isLoading, error } = useGetCurrentUser({
    query: {
      retry: false,
      queryKey: getGetCurrentUserQueryKey(),
    },
  });

  const logoutMutation = useLogout();

  useEffect(() => {
    if (!isLoading && (error || !user)) {
      if (currentLocation !== "/login") {
        setLocation("/login");
      }
    }
  }, [error, user, isLoading, currentLocation, setLocation]);

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      window.location.href = `${basePath}/login`;
    }
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
