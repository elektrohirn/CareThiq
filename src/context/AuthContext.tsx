import { createContext, ReactNode, useContext, useState } from 'react';
import { api } from '../services/api';

export type UserRole = 'patient' | 'caregiver' | 'casual';

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      const data = await api.login(email, password);
      setUser({
        id: data.id,
        username: data.email,
        name: data.name,
        role: data.role as UserRole,
        email: data.email,
        token: data.token,
      });
      return { success: true, role: data.role as UserRole };
    } catch (e: any) {
      return { success: false, error: e.message ?? 'Server nicht erreichbar.' };
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
  return ctx;
}