import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { getCurrentUser, saveUser, initializeDatabase } from './database_temp';
import { getPermissions, Permission } from './permissions';

interface UserContextType {
  user: UserProfile | null;
  permissions: Permission;
  isLoading: boolean;
  updateUser: (user: UserProfile) => void;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeDatabase();
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // Add a small delay to ensure auth context is initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      const currentUser = await getCurrentUser();
      console.log('UserContext - Loaded user:', currentUser);
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (newUser: UserProfile) => {
    try {
      await saveUser(newUser);
      setUser(newUser);
      console.log('UserContext - Updated user:', newUser);
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const clearUser = () => {
    setUser(null);
  };

  const permissions = user ? getPermissions(user.role) : {
    createParcels: false,
    editParcels: false,
    uploadRasters: false,
    drawBoundaries: false,
    assignParcels: false,
    viewAllParcels: false,
    uploadDocuments: false,
    viewAllDocuments: false,
    manageUsers: false,
    receiveAllAlerts: false,
    generateGISReports: false
  };

  console.log('UserContext - Render with user:', user?.role, 'permissions:', permissions);

  return (
    <UserContext.Provider value={{ user, permissions, isLoading, updateUser, clearUser }}>
      {children}
    </UserContext.Provider>
  );
};