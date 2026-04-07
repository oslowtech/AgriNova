import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { UserProfile, UserRole } from '../types';

const STORAGE_KEYS = {
  USERS: 'agrinova_users',
  PARCELS: 'agrinova_parcels', 
  PARCEL_HEALTH: 'agrinova_parcel_health',
  PARCEL_VALUATIONS: 'agrinova_parcel_valuations',
  CURRENT_USER: 'agrinova_current_user' // SecureStore for sensitive data
};

// Simple initialization
export const initializeDatabase = () => {
  console.log('Database initialized using AsyncStorage + SecureStore');
};

// User management
export const saveUser = async (user: UserProfile) => {
  try {
    // Store user data in AsyncStorage
    const users = await getStoredData(STORAGE_KEYS.USERS);
    users[user.uid] = user;
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    
    // Store current user reference securely
    await SecureStore.setItemAsync(STORAGE_KEYS.CURRENT_USER, user.uid);
  } catch (error) {
    console.error('Failed to save user:', error);
  }
};

export const getUser = async (userId: string): Promise<UserProfile | null> => {
  try {
    const users = await getStoredData(STORAGE_KEYS.USERS);
    return users[userId] || null;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    // Get current user ID from secure store
    const currentUserId = await SecureStore.getItemAsync(STORAGE_KEYS.CURRENT_USER);
    if (!currentUserId) return null;
    
    // Get user data from AsyncStorage
    return await getUser(currentUserId);
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

// Parcel management
export interface Parcel {
  id: string;
  name: string;
  ownerId: string;
  consultantId: string | null;
  boundary: Array<{latitude: number, longitude: number}>;
  areaHectares: number;
  cropType: string;
  createdAt: string;
  updatedAt: string;
}

export const createParcel = async (parcel: Omit<Parcel, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const id = `parcel_${Date.now()}`;
    const now = new Date().toISOString();
    const newParcel: Parcel = {
      ...parcel,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    const parcels = await getStoredData(STORAGE_KEYS.PARCELS);
    parcels[id] = newParcel;
    await AsyncStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));
    
    return id;
  } catch (error) {
    console.error('Failed to create parcel:', error);
    return '';
  }
};

export const getParcelsForUser = async (userId: string, userRole: UserRole): Promise<Parcel[]> => {
  try {
    const parcels = await getStoredData(STORAGE_KEYS.PARCELS);
    const parcelList = Object.values(parcels) as Parcel[];
    
    if (userRole === 'land_consultant') {
      // Consultants can see all parcels they manage or unassigned parcels
      return parcelList.filter(p => p.consultantId === userId || p.consultantId === null);
    } else {
      // Landowners can only see their own parcels
      return parcelList.filter(p => p.ownerId === userId);
    }
  } catch (error) {
    console.error('Failed to get parcels:', error);
    return [];
  }
};

export const updateParcel = async (parcelId: string, updates: Partial<Parcel>) => {
  try {
    const parcels = await getStoredData(STORAGE_KEYS.PARCELS);
    if (parcels[parcelId]) {
      parcels[parcelId] = {
        ...parcels[parcelId],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await AsyncStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));
    }
  } catch (error) {
    console.error('Failed to update parcel:', error);
  }
};

export const assignParcelToOwner = async (parcelId: string, ownerId: string) => {
  await updateParcel(parcelId, { ownerId });
};

// Health data management
export const saveParcelHealth = async (parcelId: string, healthData: any) => {
  try {
    const healthDataStore = await getStoredData(STORAGE_KEYS.PARCEL_HEALTH);
    const id = `health_${Date.now()}`;
    healthDataStore[id] = {
      id,
      parcelId,
      ...healthData,
      assessmentDate: new Date().toISOString()
    };
    await AsyncStorage.setItem(STORAGE_KEYS.PARCEL_HEALTH, JSON.stringify(healthDataStore));
  } catch (error) {
    console.error('Failed to save parcel health:', error);
  }
};

export const getParcelHealth = async (parcelId: string) => {
  try {
    const healthDataStore = await getStoredData(STORAGE_KEYS.PARCEL_HEALTH);
    const healthEntries = Object.values(healthDataStore) as any[];
    const parcelHealthData = healthEntries
      .filter(h => h.parcelId === parcelId)
      .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());
    
    return parcelHealthData[0] || null;
  } catch (error) {
    console.error('Failed to get parcel health:', error);
    return null;
  }
};

// Valuation data management
export const saveParcelValuation = async (parcelId: string, valuationData: any) => {
  try {
    const valuationStore = await getStoredData(STORAGE_KEYS.PARCEL_VALUATIONS);
    const id = `valuation_${Date.now()}`;
    valuationStore[id] = {
      id,
      parcelId,
      ...valuationData,
      valuationDate: new Date().toISOString()
    };
    await AsyncStorage.setItem(STORAGE_KEYS.PARCEL_VALUATIONS, JSON.stringify(valuationStore));
  } catch (error) {
    console.error('Failed to save parcel valuation:', error);
  }
};

export const getParcelValuation = async (parcelId: string) => {
  try {
    const valuationStore = await getStoredData(STORAGE_KEYS.PARCEL_VALUATIONS);
    const valuationEntries = Object.values(valuationStore) as any[];
    const parcelValuations = valuationEntries
      .filter(v => v.parcelId === parcelId)
      .sort((a, b) => new Date(b.valuationDate).getTime() - new Date(a.valuationDate).getTime());
    
    return parcelValuations[0] || null;
  } catch (error) {
    console.error('Failed to get parcel valuation:', error);
    return null;
  }
};

// Helper function to get stored data from AsyncStorage
const getStoredData = async (key: string): Promise<Record<string, any>> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error(`Failed to get stored data for ${key}:`, error);
    return {};
  }
};

// Permission helpers
export const canCreateParcels = (userRole: UserRole): boolean => {
  return userRole === 'land_consultant';
};

export const canEditParcels = (userRole: UserRole): boolean => {
  return userRole === 'land_consultant';
};

export const canUploadDocuments = (userRole: UserRole): boolean => {
  return userRole === 'land_consultant';
};

export const canManageUsers = (userRole: UserRole): boolean => {
  return userRole === 'land_consultant';
};

export const canViewAllParcels = (userRole: UserRole): boolean => {
  return userRole === 'land_consultant';
};

export const canDrawBoundaries = (userRole: UserRole): boolean => {
  return userRole === 'land_consultant';
};