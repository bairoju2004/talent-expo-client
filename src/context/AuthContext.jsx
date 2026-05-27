import { createContext, useContext, useState } from 'react';
import { logoutUser } from '../api/services';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
  };

  const logout = async () => {
    // Tell the server to blacklist the token in Redis
    // Wrapped in try/catch so a network error never blocks the client-side logout
    try {
      await logoutUser();
    } catch {
      // Server unreachable or token already expired — still clear locally
    }

    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}