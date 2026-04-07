import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import { getFirebaseDb } from "../config/firebase";
import { UserProfile, UserRole } from "../types";

const STORAGE_KEYS = {
  USERS: "geoinsight_users",
  PARCELS: "geoinsight_parcels",
  PARCEL_HEALTH: "geoinsight_parcel_health",
  PARCEL_VALUATIONS: "geoinsight_parcel_valuations",
  CURRENT_USER: "geoinsight_current_user"
};

const COLLECTIONS = {
  USERS: "users",
  PARCELS: "parcels",
  PARCEL_HEALTH: "parcel_health",
  PARCEL_VALUATIONS: "parcel_valuations"
};

export const initializeDatabase = () => {
  console.log("Database initialized (Firestore + local fallback cache)");
};

const nowIso = () => new Date().toISOString();

const asDate = (value: unknown): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return new Date();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return new Date();
    }
  }
  return new Date();
};

const getStoredData = async (key: string): Promise<Record<string, unknown>> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? (JSON.parse(data) as Record<string, unknown>) : {};
  } catch (error) {
    console.error(`Failed to get stored data for ${key}:`, error);
    return {};
  }
};

const setStoredData = async (key: string, value: Record<string, unknown>) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

const upsertLocalById = async (key: string, id: string, value: unknown) => {
  const current = await getStoredData(key);
  current[id] = value;
  await setStoredData(key, current);
};

const toUserProfile = (uid: string, raw: Record<string, unknown>): UserProfile => ({
  uid,
  phone: typeof raw.phone === "string" ? raw.phone : undefined,
  email: typeof raw.email === "string" ? raw.email : undefined,
  name: typeof raw.name === "string" ? raw.name : "",
  role: raw.role === "land_consultant" ? "land_consultant" : "landowner",
  createdAt: asDate(raw.createdAt)
});

const toParcel = (id: string, raw: Record<string, unknown>): Parcel => ({
  id,
  name: typeof raw.name === "string" ? raw.name : "Untitled Parcel",
  ownerId: typeof raw.ownerId === "string" ? raw.ownerId : "",
  consultantId: typeof raw.consultantId === "string" ? raw.consultantId : null,
  boundary: Array.isArray(raw.boundary)
    ? (raw.boundary as Array<{ latitude: number; longitude: number }>)
    : [],
  areaHectares: typeof raw.areaHectares === "number" ? raw.areaHectares : 0,
  cropType: typeof raw.cropType === "string" ? raw.cropType : "",
  createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
  updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso()
});

// User management
export const saveUser = async (user: UserProfile) => {
  try {
    const db = getFirebaseDb();
    if (db) {
      await setDoc(
        doc(db, COLLECTIONS.USERS, user.uid),
        {
          uid: user.uid,
          email: user.email ?? null,
          phone: user.phone ?? null,
          role: user.role,
          name: user.name,
          createdAt: user.createdAt ?? serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }

    await upsertLocalById(STORAGE_KEYS.USERS, user.uid, {
      ...user,
      createdAt: (user.createdAt ?? new Date()).toISOString()
    });
    await SecureStore.setItemAsync(STORAGE_KEYS.CURRENT_USER, user.uid);
  } catch (error) {
    console.error("Failed to save user:", error);
  }
};

export const getUser = async (userId: string): Promise<UserProfile | null> => {
  try {
    const db = getFirebaseDb();
    if (db) {
      const snapshot = await getDoc(doc(db, COLLECTIONS.USERS, userId));
      if (snapshot.exists()) {
        const firestoreUser = toUserProfile(userId, snapshot.data() as Record<string, unknown>);
        await upsertLocalById(STORAGE_KEYS.USERS, userId, {
          ...firestoreUser,
          createdAt: firestoreUser.createdAt.toISOString()
        });
        return firestoreUser;
      }
    }

    const users = await getStoredData(STORAGE_KEYS.USERS);
    const raw = users[userId];
    if (!raw || typeof raw !== "object") return null;
    return toUserProfile(userId, raw as Record<string, unknown>);
  } catch (error) {
    console.error("Failed to get user:", error);
    return null;
  }
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    const currentUserId = await SecureStore.getItemAsync(STORAGE_KEYS.CURRENT_USER);
    if (!currentUserId) return null;
    return await getUser(currentUserId);
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
};

// Parcel management
export interface Parcel {
  id: string;
  name: string;
  ownerId: string;
  consultantId: string | null;
  boundary: Array<{ latitude: number; longitude: number }>;
  areaHectares: number;
  cropType: string;
  createdAt: string;
  updatedAt: string;
}

export const createParcel = async (
  parcel: Omit<Parcel, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  try {
    const id = `parcel_${Date.now()}`;
    const now = nowIso();
    const newParcel: Parcel = {
      ...parcel,
      id,
      createdAt: now,
      updatedAt: now
    };

    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, COLLECTIONS.PARCELS, id), {
        ...newParcel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    await upsertLocalById(STORAGE_KEYS.PARCELS, id, newParcel);
    return id;
  } catch (error) {
    console.error("Failed to create parcel:", error);
    return "";
  }
};

const fetchParcelsFromFirestore = async (userId: string, userRole: UserRole): Promise<Parcel[]> => {
  const db = getFirebaseDb();
  if (!db) return [];

  if (userRole === "land_consultant") {
    const consultantQuery = query(
      collection(db, COLLECTIONS.PARCELS),
      where("consultantId", "==", userId)
    );

    const unassignedQuery = query(
      collection(db, COLLECTIONS.PARCELS),
      where("consultantId", "==", null)
    );

    const [consultantSnapshot, unassignedSnapshot] = await Promise.all([
      getDocs(consultantQuery),
      getDocs(unassignedQuery)
    ]);

    const map = new Map<string, Parcel>();
    consultantSnapshot.forEach((snap) => {
      map.set(snap.id, toParcel(snap.id, snap.data() as Record<string, unknown>));
    });
    unassignedSnapshot.forEach((snap) => {
      map.set(snap.id, toParcel(snap.id, snap.data() as Record<string, unknown>));
    });

    return Array.from(map.values());
  }

  const ownerQuery = query(collection(db, COLLECTIONS.PARCELS), where("ownerId", "==", userId));
  const snapshot = await getDocs(ownerQuery);
  return snapshot.docs.map((d) => toParcel(d.id, d.data() as Record<string, unknown>));
};

export const getParcelsForUser = async (userId: string, userRole: UserRole): Promise<Parcel[]> => {
  try {
    const firestoreParcels = await fetchParcelsFromFirestore(userId, userRole);
    if (firestoreParcels.length > 0) {
      const local: Record<string, unknown> = {};
      for (const parcel of firestoreParcels) {
        local[parcel.id] = parcel;
      }
      await setStoredData(STORAGE_KEYS.PARCELS, local);
      return firestoreParcels;
    }

    const localParcels = await getStoredData(STORAGE_KEYS.PARCELS);
    const parcelList = Object.entries(localParcels).map(([id, raw]) =>
      toParcel(id, raw as Record<string, unknown>)
    );

    if (userRole === "land_consultant") {
      return parcelList.filter((p) => p.consultantId === userId || p.consultantId === null);
    }
    return parcelList.filter((p) => p.ownerId === userId);
  } catch (error) {
    console.error("Failed to get parcels:", error);
    return [];
  }
};

export const updateParcel = async (parcelId: string, updates: Partial<Parcel>) => {
  try {
    const next = {
      ...updates,
      updatedAt: nowIso()
    };

    const db = getFirebaseDb();
    if (db) {
      await setDoc(
        doc(db, COLLECTIONS.PARCELS, parcelId),
        {
          ...next,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }

    const parcels = await getStoredData(STORAGE_KEYS.PARCELS);
    const existing = (parcels[parcelId] as Record<string, unknown>) || {};
    parcels[parcelId] = {
      ...existing,
      ...next,
      id: parcelId
    };
    await setStoredData(STORAGE_KEYS.PARCELS, parcels);
  } catch (error) {
    console.error("Failed to update parcel:", error);
  }
};

export const assignParcelToOwner = async (parcelId: string, ownerId: string) => {
  await updateParcel(parcelId, { ownerId });
};

// Health data management
export const saveParcelHealth = async (parcelId: string, healthData: Record<string, unknown>) => {
  try {
    const id = `health_${Date.now()}`;
    const record = {
      id,
      parcelId,
      ...healthData,
      assessmentDate: nowIso()
    };

    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, COLLECTIONS.PARCEL_HEALTH, id), {
        ...record,
        assessmentDate: serverTimestamp()
      });
    }

    await upsertLocalById(STORAGE_KEYS.PARCEL_HEALTH, id, record);
  } catch (error) {
    console.error("Failed to save parcel health:", error);
  }
};

export const getParcelHealth = async (parcelId: string) => {
  try {
    const db = getFirebaseDb();
    if (db) {
      const q = query(
        collection(db, COLLECTIONS.PARCEL_HEALTH),
        where("parcelId", "==", parcelId),
        orderBy("assessmentDate", "desc"),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        if (!docData) return null;
        const data = docData.data() as Record<string, unknown>;
        const parsed = {
          id: docData.id,
          parcelId,
          ...data,
          assessmentDate: asDate(data.assessmentDate).toISOString()
        };
        await upsertLocalById(STORAGE_KEYS.PARCEL_HEALTH, docData.id, parsed);
        return parsed;
      }
    }

    const healthDataStore = await getStoredData(STORAGE_KEYS.PARCEL_HEALTH);
    const healthEntries = Object.values(healthDataStore) as Array<Record<string, unknown>>;
    const parcelHealthData = healthEntries
      .filter((h) => h.parcelId === parcelId)
      .sort(
        (a, b) =>
          new Date(String(b.assessmentDate ?? "")).getTime() - new Date(String(a.assessmentDate ?? "")).getTime()
      );

    return parcelHealthData[0] || null;
  } catch (error) {
    console.error("Failed to get parcel health:", error);
    return null;
  }
};

// Valuation data management
export const saveParcelValuation = async (parcelId: string, valuationData: Record<string, unknown>) => {
  try {
    const id = `valuation_${Date.now()}`;
    const record = {
      id,
      parcelId,
      ...valuationData,
      valuationDate: nowIso()
    };

    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, COLLECTIONS.PARCEL_VALUATIONS, id), {
        ...record,
        valuationDate: serverTimestamp()
      });
    }

    await upsertLocalById(STORAGE_KEYS.PARCEL_VALUATIONS, id, record);
  } catch (error) {
    console.error("Failed to save parcel valuation:", error);
  }
};

export const getParcelValuation = async (parcelId: string) => {
  try {
    const db = getFirebaseDb();
    if (db) {
      const q = query(
        collection(db, COLLECTIONS.PARCEL_VALUATIONS),
        where("parcelId", "==", parcelId),
        orderBy("valuationDate", "desc"),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        if (!docData) return null;
        const data = docData.data() as Record<string, unknown>;
        const parsed = {
          id: docData.id,
          parcelId,
          ...data,
          valuationDate: asDate(data.valuationDate).toISOString()
        };
        await upsertLocalById(STORAGE_KEYS.PARCEL_VALUATIONS, docData.id, parsed);
        return parsed;
      }
    }

    const valuationStore = await getStoredData(STORAGE_KEYS.PARCEL_VALUATIONS);
    const valuationEntries = Object.values(valuationStore) as Array<Record<string, unknown>>;
    const parcelValuations = valuationEntries
      .filter((v) => v.parcelId === parcelId)
      .sort(
        (a, b) =>
          new Date(String(b.valuationDate ?? "")).getTime() - new Date(String(a.valuationDate ?? "")).getTime()
      );

    return parcelValuations[0] || null;
  } catch (error) {
    console.error("Failed to get parcel valuation:", error);
    return null;
  }
};

// Permission helpers
export const canCreateParcels = (userRole: UserRole): boolean => {
  return userRole === "land_consultant";
};

export const canEditParcels = (userRole: UserRole): boolean => {
  return userRole === "land_consultant";
};

export const canUploadDocuments = (userRole: UserRole): boolean => {
  return userRole === "land_consultant";
};

export const canManageUsers = (userRole: UserRole): boolean => {
  return userRole === "land_consultant";
};

export const canViewAllParcels = (userRole: UserRole): boolean => {
  return userRole === "land_consultant";
};

export const canDrawBoundaries = (userRole: UserRole): boolean => {
  return userRole === "land_consultant";
};
