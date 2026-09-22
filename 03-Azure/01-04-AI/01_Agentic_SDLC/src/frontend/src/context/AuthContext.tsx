import { createContext, useContext, useState, ReactNode } from 'react';

export const demoUsers = [
  { email: 'admin@github.com', password: 'Admin123!' },
  { email: 'alice@github.com', password: 'Password123!' },
  { email: 'bob@github.com', password: 'Password123!' },
  { email: 'charlie@github.com', password: 'Password123!' },
  { email: 'danielle@github.com', password: 'Password123!' },
  { email: 'eric@github.com', password: 'Password123!' },
  { email: 'faiza@github.com', password: 'Password123!' },
  { email: 'george@github.com', password: 'Password123!' },
  { email: 'hannah@github.com', password: 'Password123!' },
  { email: 'ivan@github.com', password: 'Password123!' },
];

interface AuthContextType {
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const matchingUser = demoUsers.find(
      (user) =>
        user.email.toLowerCase() === normalizedEmail && user.password === password,
    );

    if (!matchingUser) {
      throw new Error('Invalid credentials');
    }

    setIsLoggedIn(true);
    setIsAdmin(matchingUser.email.toLowerCase() === 'admin@github.com');
  };

  const logout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
