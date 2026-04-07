import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, initializeAuth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { Platform } from "react-native";

// Only import persistence for native platforms
let getReactNativePersistence: any = null;
let AsyncStorage: any = null;

if (Platform.OS !== "web") {
  try {
    getReactNativePersistence = require("firebase/auth").getReactNativePersistence;
    AsyncStorage = require("@react-native-async-storage/async-storage").default;
  } catch (e) {
    console.warn("Could not load React Native persistence:", e);
  }
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let initError: Error | null = null;

function initFirebase(): FirebaseApp | null {
  if (initError) return null;
  
  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
      throw new Error(
        "Firebase config is missing. Set EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_PROJECT_ID, and EXPO_PUBLIC_FIREBASE_APP_ID in frontend/.env"
      );
    }

    const apps = getApps();
    if (apps.length === 0) {
      return initializeApp(firebaseConfig);
    }
    return apps[0] ?? null;
  } catch (error) {
    console.warn("Firebase init failed:", error);
    initError = error as Error;
    return null;
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseApp && !initError) {
    firebaseApp = initFirebase();
  }
  return firebaseApp;
}

export function getFirebaseAuth(): Auth | null {
  if (!firebaseAuth && !initError) {
    const app = getFirebaseApp();
    if (app) {
      try {
        // Use initializeAuth with AsyncStorage persistence for React Native
        if (Platform.OS !== "web" && getReactNativePersistence && AsyncStorage) {
          firebaseAuth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
          });
        } else {
          // Fallback for web or if persistence not available
          firebaseAuth = getAuth(app);
        }
      } catch (error: any) {
        // If already initialized, get the existing instance
        if (error.code === "auth/already-initialized") {
          firebaseAuth = getAuth(app);
        } else {
          console.warn("Firebase Auth init failed:", error);
          // Final fallback
          try {
            firebaseAuth = getAuth(app);
          } catch (e) {
            console.warn("Firebase Auth fallback failed:", e);
          }
        }
      }
    }
  }
  return firebaseAuth;
}

export function getFirebaseDb(): Firestore | null {
  if (!firebaseDb && !initError) {
    const app = getFirebaseApp();
    if (app) {
      try {
        firebaseDb = getFirestore(app);
      } catch (error) {
        console.warn("Firebase Firestore init failed:", error);
      }
    }
  }
  return firebaseDb;
}

export { firebaseConfig };
