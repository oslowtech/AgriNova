import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, Pressable, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthScreen } from "./src/screens/AuthScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { initializeAuth, onAuthStateChanged, restoreAuthSession } from "./src/services/auth";
import { LanguageProvider } from "./src/services/LanguageContext";
import { UserProvider } from "./src/services/UserContext";
import { UserProfile } from "./src/types";
import { palette } from "./src/theme";

type AuthState = "loading" | "unauthenticated" | "onboarding" | "authenticated";

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [pendingUser, setPendingUser] = useState<Partial<UserProfile> | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await initializeAuth();
        
        // Try to restore existing auth session
        const restoredUser = await restoreAuthSession();
        if (restoredUser) {
          console.log('Restored user session:', restoredUser);
          setAuthState("authenticated");
          return;
        }
        
        onAuthStateChanged((user) => {
          if (user && user.name) {
            setAuthState("authenticated");
          } else if (authState !== "onboarding") {
            setAuthState("unauthenticated");
          }
        });
      } catch (err) {
        console.error("Init error:", err);
        setError((err as Error).message);
        setAuthState("unauthenticated");
      }
    }
    
    init();
  }, []);

  function handleNeedsOnboarding(user: Partial<UserProfile>, token: string) {
    console.log("handleNeedsOnboarding called with user:", user);
    console.log("User UID:", user.uid);
    setPendingUser(user);
    setPendingToken(token);
    setAuthState("onboarding");
  }

  function handleOnboardingComplete() {
    setPendingUser(null);
    setPendingToken(null);
    setAuthState("authenticated");
  }

  function handleAuthenticated() {
    setAuthState("authenticated");
  }

  if (error) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setError(null); setAuthState("unauthenticated"); }}>
            <Text style={styles.retryText}>Continue Anyway</Text>
          </Pressable>
        </View>
      </SafeAreaProvider>
    );
  }

  if (authState === "loading") {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: palette.bg }}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={{ marginTop: 16, color: palette.textSecondary }}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <LanguageProvider>
      <UserProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          {authState === "authenticated" ? (
            <AppNavigator />
          ) : authState === "onboarding" && pendingUser && pendingToken ? (
            <OnboardingScreen 
              pendingUser={pendingUser}
              pendingToken={pendingToken}
              onComplete={handleOnboardingComplete}
            />
          ) : (
            <AuthScreen 
              onAuthenticated={handleAuthenticated}
              onNeedsOnboarding={handleNeedsOnboarding}
            />
          )}
        </SafeAreaProvider>
      </UserProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.bg,
    padding: 24
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#D32F2F",
    marginBottom: 12
  },
  errorText: {
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: "center",
    marginBottom: 24
  },
  retryBtn: {
    backgroundColor: palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryText: {
    color: "#fff",
    fontWeight: "600"
  }
});
