import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role } from '../types';
import { AuthService } from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  activeRole: Role;
  login: (emailOrRoll: string, password: string) => { success: boolean; message?: string; user?: User; requiresRoleSelection?: boolean };
  logout: () => void;
  selectRole: (user: User, role: Role) => void;
  switchRole: (role: Role) => void;
  updateUser: (updatedData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => AuthService.getCurrentUser());
  const [activeRole, setActiveRole] = useState<Role>(() => {
    const user = AuthService.getCurrentUser();
    return user ? (user.activeRole || user.role) : 'student';
  });

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setActiveRole(user.activeRole || user.role);
    }
  }, []);

  const login = (emailOrRoll: string, password: string) => {
    const res = AuthService.authenticate(emailOrRoll, password);
    if (res.success && res.user && !res.requiresRoleSelection) {
      setCurrentUser(res.user);
      setActiveRole(res.user.activeRole || res.user.role);
    }
    return res;
  };

  const selectRole = (user: User, role: Role) => {
    AuthService.setCurrentUser(user, role);
    const updated = { ...user, activeRole: role };
    setCurrentUser(updated);
    setActiveRole(role);
  };

  const switchRole = (role: Role) => {
    if (currentUser) {
      selectRole(currentUser, role);
    }
  };

  const logout = () => {
    AuthService.logout();
    try {
      sessionStorage.removeItem('siet_auth_user_v5');
      sessionStorage.removeItem('siet_auth_user');
      sessionStorage.removeItem('siet_auth_token');
      localStorage.removeItem('siet_auth_user_v5');
      localStorage.removeItem('siet_auth_user');
      localStorage.removeItem('siet_auth_token');
    } catch (e) {}
    setCurrentUser(null);
    setActiveRole('student');
  };

  const updateUser = (updatedData: Partial<User>) => {
    if (currentUser) {
      const updated = { ...currentUser, ...updatedData };
      AuthService.setCurrentUser(updated, activeRole);
      setCurrentUser(updated);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, activeRole, login, logout, selectRole, switchRole, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
