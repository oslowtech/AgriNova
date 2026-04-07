import React, { useState } from "react";
import { 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  Pressable, 
  StyleSheet, 
  Text, 
  TextInput, 
  View 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, radius, shadows, spacing, typography } from "../theme";
import { completeOnboarding } from "../services/auth";
import { UserProfile, UserRole } from "../types";

type Props = {
  pendingUser: Partial<UserProfile>;
  pendingToken: string;
  onComplete: () => void;
};

export function OnboardingScreen({ pendingUser, pendingToken, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(pendingUser.name || "");
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!role) {
      setError("Please select your role");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await completeOnboarding(name.trim(), role, pendingToken, pendingUser);
      onComplete();
    } catch (err) {
      setError((err as Error).message || "Failed to complete registration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top + spacing.xl }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>Welcome to AgriNova</Text>
        <Text style={styles.subtitle}>Let's set up your account</Text>
      </View>

      <View style={styles.form}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        <Text style={styles.inputLabel}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor={palette.subtle}
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          autoCapitalize="words"
        />

        <Text style={styles.inputLabel}>Select Your Role</Text>
        <Text style={styles.roleNote}>
          This determines what features you can access. This choice is final.
        </Text>

        <Pressable 
          style={[styles.roleCard, role === "land_consultant" && styles.roleCardSelected]}
          onPress={() => { setRole("land_consultant"); setError(null); }}
        >
          <Text style={styles.roleIcon}>🏛️</Text>
          <View style={styles.roleContent}>
            <Text style={[styles.roleTitle, role === "land_consultant" && styles.roleTitleSelected]}>
              Land Consultant
            </Text>
            <Text style={styles.roleDesc}>
              Create parcels, upload drone data, manage landowners
            </Text>
          </View>
          {role === "land_consultant" && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </Pressable>

        <Pressable 
          style={[styles.roleCard, role === "landowner" && styles.roleCardSelected]}
          onPress={() => { setRole("landowner"); setError(null); }}
        >
          <Text style={styles.roleIcon}>🧑‍🌾</Text>
          <View style={styles.roleContent}>
            <Text style={[styles.roleTitle, role === "landowner" && styles.roleTitleSelected]}>
              Landowner
            </Text>
            <Text style={styles.roleDesc}>
              View land health, receive alerts for your parcels
            </Text>
          </View>
          {role === "landowner" && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </Pressable>

        <Pressable 
          style={[
            styles.primaryBtn, 
            loading && styles.primaryBtnDisabled,
            (!name.trim() || !role) && styles.primaryBtnDisabled
          ]} 
          onPress={handleComplete}
          disabled={loading || !name.trim() || !role}
        >
          {loading ? (
            <ActivityIndicator color={palette.surface} />
          ) : (
            <Text style={styles.primaryBtnText}>Complete Registration</Text>
          )}
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.footerText}>
          Your data is stored securely and never shared
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
    marginBottom: spacing.xl
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm
  },
  title: {
    ...typography.h2,
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
    ...typography.bodyBold,
    color: palette.ink,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs
  },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.lg,
    color: palette.ink,
    ...typography.body,
    ...shadows.sm
  },
  roleNote: {
    ...typography.small,
    color: palette.muted,
    marginBottom: spacing.md,
    marginLeft: spacing.xs
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm
  },
  roleCardSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primary + "08"
  },
  roleIcon: {
    fontSize: 32,
    marginRight: spacing.md
  },
  roleContent: {
    flex: 1
  },
  roleTitle: {
    ...typography.bodyBold,
    color: palette.ink,
    marginBottom: 2
  },
  roleTitleSelected: {
    color: palette.primary
  },
  roleDesc: {
    ...typography.small,
    color: palette.muted
  },
  checkmark: {
    fontSize: 20,
    color: palette.primary,
    fontWeight: "700"
  },
  primaryBtn: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.lg,
    ...shadows.md
  },
  primaryBtnDisabled: {
    opacity: 0.5
  },
  primaryBtnText: {
    color: palette.surface,
    ...typography.bodyBold
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
