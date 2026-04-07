import { 
  signInWithPhoneNumber, 
  PhoneAuthProvider, 
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  ConfirmationResult,
  RecaptchaVerifier
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import * as SecureStore from "expo-secure-store";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { getFirebaseAuth, getFirebaseDb } from "../config/firebase";
import { UserProfile, UserRole } from "../types";
import { setAuthToken } from "../api/client";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "auth_token";
const USER_KEY = "user_profile";

let currentUser: UserProfile | null = null;
let authStateListeners: ((user: UserProfile | null) => void)[] = [];
let confirmationResult: ConfirmationResult | null = null;

export function onAuthStateChanged(callback: (user: UserProfile | null) => void): () => void {
  authStateListeners.push(callback);
  callback(currentUser);
  return () => {
    authStateListeners = authStateListeners.filter((cb) => cb !== callback);
  };
}

function notifyListeners() {
  authStateListeners.forEach((cb) => cb(currentUser));
}

export async function initializeAuth(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const userJson = await SecureStore.getItemAsync(USER_KEY);
    
    if (token && userJson) {
      setAuthToken(token);
      currentUser = JSON.parse(userJson);
      notifyListeners();
    }

    const auth = getFirebaseAuth();
    if (auth) {
      firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdToken();
            setAuthToken(token);
            
            const db = getFirebaseDb();
            if (db) {
              const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                currentUser = {
                  uid: firebaseUser.uid,
                  phone: firebaseUser.phoneNumber || undefined,
                  email: firebaseUser.email || undefined,
                  name: userData?.name || firebaseUser.displayName || "",
                  role: userData?.role || "landowner",
                  createdAt: userData?.createdAt?.toDate() || new Date()
                };
                await SecureStore.setItemAsync(TOKEN_KEY, token);
                await SecureStore.setItemAsync(USER_KEY, JSON.stringify(currentUser));
                notifyListeners();
              }
            }
          } catch (error) {
            console.warn("Firebase auth state error:", error);
          }
        }
      });
    }
  } catch (error) {
    console.error("Failed to initialize auth:", error);
  }
}

export async function saveAuthSession(token: string, user: UserProfile): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  setAuthToken(token);
  currentUser = user;
  notifyListeners();
}

export async function clearAuthSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  setAuthToken(null);
  currentUser = null;
  notifyListeners();
}

export function getCurrentUser(): UserProfile | null {
  return currentUser;
}

export async function sendOTP(phoneNumber: string): Promise<string> {
  // For Expo Go, we use a mock OTP flow since reCAPTCHA doesn't work
  // In production with a dev build, you'd use real phone auth
  console.log("Sending OTP to:", phoneNumber);
  
  // Mock: Store the phone number and return a fake verification ID
  await SecureStore.setItemAsync("pending_phone", phoneNumber);
  return `mock_verification_${Date.now()}`;
}

export async function verifyOTP(verificationCode: string): Promise<{ user: UserProfile; token: string; isNewUser: boolean }> {
  // For demo/hackathon: accept any 6-digit code
  if (verificationCode.length !== 6) {
    throw new Error("Please enter a 6-digit code");
  }

  const pendingPhone = await SecureStore.getItemAsync("pending_phone");
  if (!pendingPhone) {
    throw new Error("Please request OTP first");
  }

  // Create a mock user for demo
  const mockToken = `demo_token_${Date.now()}`;
  const uid = `user_${pendingPhone.replace(/\D/g, "")}`;
  
  let userDoc = null;
  const db = getFirebaseDb();
  if (db) {
    try {
      userDoc = await getDoc(doc(db, "users", uid));
    } catch (e) {
      // Silent fail - demo mode works without Firestore
    }
  }
  
  const isNewUser = !userDoc?.exists();
  
  const user: UserProfile = {
    uid,
    phone: pendingPhone,
    name: userDoc?.data()?.name || "",
    role: userDoc?.data()?.role || "landowner",
    createdAt: userDoc?.data()?.createdAt?.toDate() || new Date()
  };

  if (!isNewUser) {
    await saveAuthSession(mockToken, user);
  }

  await SecureStore.deleteItemAsync("pending_phone");
  return { user, token: mockToken, isNewUser };
}

export async function signInWithPhone(
  phoneNumber: string,
  verificationCode: string
): Promise<{ user: UserProfile; token: string; isNewUser: boolean }> {
  return verifyOTP(verificationCode);
}

export async function signInWithGoogleToken(idToken: string): Promise<{ user: UserProfile; token: string; isNewUser: boolean }> {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error("Firebase not available");
    }
    
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const firebaseUser = userCredential.user;
    const token = await firebaseUser.getIdToken();

    let userDoc = null;
    const db = getFirebaseDb();
    if (db) {
      try {
        userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      } catch (e) {
        // Silent fail - demo mode works without Firestore
      }
    }
    
    const isNewUser = !userDoc?.exists();

    const user: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || undefined,
      name: userDoc?.data()?.name || firebaseUser.displayName || "",
      role: userDoc?.data()?.role || "landowner",
      createdAt: userDoc?.data()?.createdAt?.toDate() || new Date()
    };

    if (!isNewUser) {
      await saveAuthSession(token, user);
    }

    return { user, token, isNewUser };
  } catch (error) {
    console.error("Google sign-in failed:", error);
    throw new Error("Google sign-in failed. Please try again.");
  }
}

export async function completeOnboarding(
  userData: {
    uid: string;
    name: string;
    role: UserRole;
    phone?: string;
    email?: string;
    location?: { latitude: number; longitude: number; address: string };
    createdAt: Date;
  },
  pendingToken: string
): Promise<UserProfile> {
  const user: UserProfile = {
    uid: userData.uid,
    phone: userData.phone,
    email: userData.email,
    name: userData.name,
    role: userData.role,
    createdAt: userData.createdAt
  };

  // Save to Firestore (silent fail for demo mode)
  const db = getFirebaseDb();
  if (db) {
    try {
      await setDoc(doc(db, "users", user.uid), {
        name: user.name,
        role: user.role,
        phone: user.phone || null,
        email: user.email || null,
        location: userData.location || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      // Silent fail - demo mode doesn't require Firestore
    }
  }

  await saveAuthSession(pendingToken, user);
  return user;
}

export async function signOut(): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    if (auth) {
      await firebaseSignOut(auth);
    }
  } catch (error) {
    console.warn("Firebase sign out failed:", error);
  }
  await clearAuthSession();
}
