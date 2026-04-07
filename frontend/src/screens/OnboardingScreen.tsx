import React, { useState } from "react";
import { 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView, 
  Platform, 
  Pressable, 
  ScrollView,
  StyleSheet, 
  Text, 
  TextInput, 
  View 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
// import * as Location from "expo-location"; // TODO: Install expo-location: npx expo install expo-location
import { palette, radius, shadows, spacing, typography } from "../theme";
import { completeOnboarding } from "../services/auth";
import { seedDemoData } from "../services/seedData";
import { UserProfile, UserRole } from "../types";

type OnboardingStep = "welcome" | "name" | "role" | "location" | "complete";

type Props = {
  pendingUser: Partial<UserProfile>;
  pendingToken: string;
  onComplete: () => void;
};

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export function OnboardingScreen({ pendingUser, pendingToken, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [name, setName] = useState(pendingUser.name || "");
  const [role, setRole] = useState<UserRole | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameNext = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    setStep("role");
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep("location");
  };

  const handleLocationAccess = async () => {
    setLoading(true);
    try {
      // TODO: Install expo-location to enable actual location access
      // const { status } = await Location.requestForegroundPermissionsAsync();
      
      // For now, just simulate location permission denied to skip to default
      Alert.alert(
        "Location Feature Coming Soon",
        "Location access will be available after installing expo-location. Using default location for now.",
        [{ text: "OK", onPress: handleSkipLocation }]
      );
    } catch (err) {
      console.error("Location error:", err);
      handleSkipLocation();
    }
    setLoading(false);
  };

  const handleSkipLocation = () => {
    const defaultLocation = {
      latitude: 12.9716,
      longitude: 77.5946,
      address: "Bangalore, Karnataka",
    };
    setLocation(defaultLocation);
    setStep("complete");
  };

  async function handleComplete() {
    console.log("handleComplete called with pendingUser:", pendingUser);
    
    if (!role) {
      Alert.alert("Error", "Please select a role");
      return;
    }

    if (!pendingUser.uid) {
      console.error("Missing UID in pendingUser:", pendingUser);
      setError("User ID is missing. Please try signing in again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await completeOnboarding({
        uid: pendingUser.uid,
        name,
        role,
        phone: pendingUser.phone,
        email: pendingUser.email,
        location: location || undefined,
        createdAt: new Date()
      }, pendingToken);

      // Only seed demo data once, not on every onboarding
      const isFirstTime = await SecureStore.getItemAsync('demo_data_seeded');
      if (!isFirstTime) {
        await seedDemoData();
        await SecureStore.setItemAsync('demo_data_seeded', 'true');
      }

      onComplete();
    } catch (err) {
      console.error("Onboarding error:", err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.welcomeTitle}>🌱 Welcome to AgriNova</Text>
      <Text style={styles.subtitle}>
        AI-powered land intelligence platform for smarter agriculture decisions
      </Text>
      
      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🗺️</Text>
          <Text style={styles.featureText}>Interactive land boundary mapping</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureText}>Real-time soil & weather analysis</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>💰</Text>
          <Text style={styles.featureText}>Land valuation estimates</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>🌿</Text>
          <Text style={styles.featureText}>Plant health zone mapping</Text>
        </View>
      </View>

      <View style={styles.buttonArea}>
        <Pressable style={styles.primaryButton} onPress={() => setStep("name")}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderName = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your name?</Text>
      <Text style={styles.stepSubtitle}>
        Help us personalize your experience
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your full name"
          placeholderTextColor={palette.muted}
          value={name}
          onChangeText={setName}
          autoFocus
          returnKeyType="next"
          onSubmitEditing={handleNameNext}
        />
      </View>

      <View style={styles.buttonArea}>
        <Pressable style={styles.primaryButton} onPress={handleNameNext}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderRole = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose your role</Text>
      <Text style={styles.stepSubtitle}>
        This determines which features are available to you
      </Text>

      <View style={styles.roleContainer}>
        <Pressable
          style={[
            styles.roleCard,
            role === "land_consultant" && styles.roleCardActive
          ]}
          onPress={() => handleRoleSelect("land_consultant")}
        >
          <Text style={styles.roleIcon}>👨‍💼</Text>
          <Text style={styles.roleTitle}>Land Consultant</Text>
          <Text style={styles.roleDescription}>
            • Upload drone rasters & GeoTIFF files
            {"\n"}• Create and edit parcel records
            {"\n"}• Draw and confirm boundaries
            {"\n"}• Access to all parcels dashboard
            {"\n"}• Assign parcels to landowners
            {"\n"}• Document vault upload access
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.roleCard,
            role === "landowner" && styles.roleCardActive
          ]}
          onPress={() => handleRoleSelect("landowner")}
        >
          <Text style={styles.roleIcon}>🧑‍🌾</Text>
          <Text style={styles.roleTitle}>Landowner</Text>
          <Text style={styles.roleDescription}>
            • View your assigned parcels only
            {"\n"}• Land health dashboard
            {"\n"}• Plant health zone maps
            {"\n"}• Tree and canopy count
            {"\n"}• Land valuation estimates
            {"\n"}• Geofencing alerts
            {"\n"}• Document vault view/download
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderLocation = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Set your location</Text>
      <Text style={styles.stepSubtitle}>
        We'll use this for accurate regional data and weather analysis
      </Text>

      <View style={styles.locationInfoBox}>
        <Text style={styles.locationIcon}>📍</Text>
        <Text style={styles.locationText}>
          Location access enables:
          {"\n"}• Historical weather patterns
          {"\n"}• Regional soil data from ISRIC
          {"\n"}• Proximity to infrastructure
          {"\n"}• Accurate land valuations
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      ) : (
        <View style={styles.locationButtons}>
          <Pressable style={styles.primaryButton} onPress={handleLocationAccess}>
            <Text style={styles.primaryButtonText}>Allow Location Access</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleSkipLocation}>
            <Text style={styles.secondaryButtonText}>Use Default (Bangalore)</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderComplete = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.completeIcon}>✅</Text>
      <Text style={styles.stepTitle}>All set, {name}!</Text>
      <Text style={styles.stepSubtitle}>
        Your profile is ready. Let's start exploring your land intelligence.
      </Text>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Name:</Text>
          <Text style={styles.summaryValue}>{name}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Role:</Text>
          <Text style={styles.summaryValue}>
            {role === "land_consultant" ? "Land Consultant" : "Landowner"}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Location:</Text>
          <Text style={styles.summaryValue}>
            {location?.address || "Default Location"}
          </Text>
        </View>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <View style={styles.buttonArea}>
        <Pressable 
          style={[styles.primaryButton, loading && styles.buttonDisabled]} 
          onPress={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={palette.surface} />
          ) : (
            <Text style={styles.primaryButtonText}>Enter AgriNova</Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case "welcome":
        return renderWelcome();
      case "name":
        return renderName();
      case "role":
        return renderRole();
      case "location":
        return renderLocation();
      case "complete":
        return renderComplete();
      default:
        return renderWelcome();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.safeContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {renderStepContent()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  safeContent: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    minHeight: "100%",
  },
  stepContainer: {
    alignItems: "center",
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
    flex: 1,
    justifyContent: "center",
  },
  welcomeTitle: {
    ...typography.h1,
    color: palette.ink,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  stepTitle: {
    ...typography.h2,
    color: palette.ink,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: palette.muted,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  stepSubtitle: {
    ...typography.body,
    color: palette.muted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  featureList: {
    width: "100%",
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: palette.ink,
    flex: 1,
  },
  inputContainer: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  textInput: {
    ...typography.body,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: palette.surface,
    color: palette.ink,
  },
  roleContainer: {
    width: "100%",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  roleCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: "center",
    ...shadows.sm,
  },
  roleCardActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primary + "11",
  },
  roleIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  roleTitle: {
    ...typography.h3,
    color: palette.ink,
    marginBottom: spacing.sm,
  },
  roleDescription: {
    ...typography.small,
    color: palette.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  locationInfoBox: {
    backgroundColor: palette.info + "22",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  locationText: {
    ...typography.small,
    color: palette.ink,
    lineHeight: 20,
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: palette.muted,
  },
  locationButtons: {
    width: "100%",
    gap: spacing.md,
  },
  completeIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  summaryContainer: {
    width: "100%",
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.bodyBold,
    color: palette.muted,
  },
  summaryValue: {
    ...typography.body,
    color: palette.ink,
    flex: 1,
    textAlign: "right",
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    width: "100%",
    ...shadows.md,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: palette.surface,
  },
  secondaryButton: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    width: "100%",
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    color: palette.ink,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    ...typography.small,
    color: palette.error,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: palette.muted,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  locationButtons: {
    gap: spacing.md,
    minHeight: 120,
    justifyContent: "center",
  },
  buttonArea: {
    minHeight: 60,
    justifyContent: "center",
  },
});
