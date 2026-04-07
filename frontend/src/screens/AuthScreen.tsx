import React, { useEffect, useState } from "react";
import { 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView, 
  Platform, 
  Pressable, 
  StyleSheet, 
  Text, 
  TextInput, 
  View 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { palette, radius, shadows, spacing, typography } from "../theme";
import { sendOTP, verifyOTP, saveAuthSession } from "../services/auth";
import { UserProfile } from "../types";

WebBrowser.maybeCompleteAuthSession();

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onAuthenticated: () => void;
  onNeedsOnboarding: (pendingUser: Partial<UserProfile>, token: string) => void;
};

export function AuthScreen({ onAuthenticated, onNeedsOnboarding }: Props) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleResponse(authentication.accessToken);
      }
    } else if (response?.type === "error") {
      setError("Google sign-in was cancelled or failed");
    }
  }, [response]);

  async function handleGoogleResponse(accessToken: string) {
    setLoading(true);
    setError(null);

    try {
      // Fetch user info from Google
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const userInfo = await userInfoResponse.json();
      
      // Create a mock session for demo
      const mockToken = `google_token_${Date.now()}`;
      const user: Partial<UserProfile> = {
        uid: `google_${userInfo.id}`,
        email: userInfo.email,
        name: userInfo.name || ""
      };

      if (user.name) {
        // User has a name, consider them onboarded
        await saveAuthSession(mockToken, user as UserProfile);
        onAuthenticated();
      } else {
        onNeedsOnboarding(user, mockToken);
      }
    } catch (err) {
      setError((err as Error).message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOTP() {
    if (!phone.trim() || phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      const verId = await sendOTP(formattedPhone);
      setVerificationId(verId);
      Alert.alert("Demo Mode", "For demo, enter any 6-digit code (e.g., 123456)");
    } catch (err) {
      setError((err as Error).message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otp.trim() || otp.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { user, token, isNewUser } = await verifyOTP(otp);
      
      if (isNewUser) {
        onNeedsOnboarding(user, token);
      } else {
        onAuthenticated();
      }
    } catch (err) {
      setError((err as Error).message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    Alert.alert(
      "Coming Soon",
      "Google Sign-In will be available in the production release. Please use OTP login for now.",
      [{ text: "OK" }]
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top + spacing.xl }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoIcon}>🌾</Text>
        </View>
        <Text style={styles.title}>GeoInsight</Text>
        <Text style={styles.subtitle}>AI-Powered Land Intelligence</Text>
      </View>

      <View style={styles.form}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        <Text style={styles.inputLabel}>Phone Number</Text>
        <View style={styles.phoneInputWrap}>
          <Text style={styles.countryCode}>+91</Text>
          <TextInput
            style={styles.phoneInput}
            keyboardType="phone-pad"
            placeholder="98765 43210"
            placeholderTextColor={palette.subtle}
            value={phone}
            onChangeText={(text) => {
              setPhone(text.replace(/\D/g, ""));
              setError(null);
            }}
            editable={!verificationId}
            maxLength={10}
          />
        </View>

        {verificationId && (
          <>
            <Text style={styles.inputLabel}>Verification Code</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Enter 6-digit OTP"
              placeholderTextColor={palette.subtle}
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/\D/g, ""));
                setError(null);
              }}
              maxLength={6}
              autoFocus
            />
            <Pressable onPress={() => { setVerificationId(null); setOtp(""); }}>
              <Text style={styles.resendText}>Change number</Text>
            </Pressable>
          </>
        )}

        <Pressable 
          style={({ pressed }) => [
            styles.primaryBtn, 
            pressed && styles.primaryBtnPressed,
            loading && styles.primaryBtnDisabled
          ]} 
          onPress={verificationId ? handleVerifyOTP : handleSendOTP} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={palette.surface} />
          ) : (
            <Text style={styles.primaryBtnText}>
              {verificationId ? "Verify & Continue" : "Send OTP"}
            </Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable 
          style={({ pressed }) => [
            styles.googleBtn,
            pressed && styles.googleBtnPressed,
            loading && styles.googleBtnDisabled
          ]} 
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingHorizontal: spacing.lg
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxl
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    ...shadows.lg
  },
  logoIcon: {
    fontSize: 40
  },
  title: {
    ...typography.h1,
    color: palette.ink,
    marginBottom: spacing.xs
  },
  subtitle: {
    ...typography.caption,
    color: palette.muted
  },
  form: {
    flex: 1
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  errorText: {
    ...typography.caption,
    color: palette.danger
  },
  inputLabel: {
    ...typography.small,
    color: palette.muted,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs
  },
  phoneInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    ...shadows.sm
  },
  countryCode: {
    ...typography.bodyBold,
    color: palette.ink,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 14,
    color: palette.ink,
    ...typography.body
  },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.md,
    color: palette.ink,
    ...typography.body,
    ...shadows.sm
  },
  resendText: {
    ...typography.caption,
    color: palette.primary,
    textAlign: "center",
    marginBottom: spacing.md
  },
  primaryBtn: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.sm,
    ...shadows.md
  },
  primaryBtnPressed: {
    backgroundColor: palette.primaryDark
  },
  primaryBtnDisabled: {
    opacity: 0.7
  },
  primaryBtnText: {
    color: palette.surface,
    ...typography.bodyBold
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border
  },
  dividerText: {
    ...typography.caption,
    color: palette.subtle,
    paddingHorizontal: spacing.md
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    gap: spacing.sm,
    ...shadows.sm
  },
  googleBtnPressed: {
    backgroundColor: palette.surfaceAlt
  },
  googleBtnDisabled: {
    opacity: 0.7
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.accent
  },
  googleBtnText: {
    ...typography.bodyBold,
    color: palette.ink
  },
  footer: {
    alignItems: "center"
  },
  footerText: {
    ...typography.small,
    color: palette.subtle,
    textAlign: "center"
  }
});
