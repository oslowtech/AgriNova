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
  apiKey: "AIzaSyB_MeF0APuRDzPNrSlJCDSOBjbKikK_-24",
  authDomain: "landhealth-21750.firebaseapp.com",
  projectId: "landhealth-21750",
  storageBucket: "landhealth-21750.firebasestorage.app",
  messagingSenderId: "641692789228",
  appId: "1:641692789228:web:b0ab1c0152d61e3e0ef8c9",
  measurementId: "G-6EP55T5CV0"
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let initError: Error | null = null;

function initFirebase(): FirebaseApp | null {
  if (initError) return null;
  
  try {
    const apps = getApps();
    if (apps.length === 0) {
      return initializeApp(firebaseConfig);
    }
    return apps[0];
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
