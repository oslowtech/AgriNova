import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, radius, shadows, spacing, typography } from "../theme";
import { getCurrentUser, signOut, onAuthStateChanged } from "../services/auth";
import { UserProfile } from "../types";
import { ParcelsScreen } from "./ParcelsScreen";
import { DocumentsScreen } from "./DocumentsScreen";
import { NotificationsScreen } from "./NotificationsScreen";
import { SettingsScreen } from "./SettingsScreen";
import { HelpScreen } from "./HelpScreen";

type ActiveScreen = "profile" | "parcels" | "documents" | "notifications" | "settings" | "help";

const MENU_ITEMS = [
  { icon: "📋", label: "My Parcels", subtitle: "View all managed fields", screen: "parcels" as ActiveScreen },
  { icon: "📄", label: "Documents", subtitle: "Land records & reports", screen: "documents" as ActiveScreen },
  { icon: "🔔", label: "Notifications", subtitle: "Alerts & updates", screen: "notifications" as ActiveScreen },
  { icon: "⚙️", label: "Settings", subtitle: "App preferences", screen: "settings" as ActiveScreen },
  { icon: "❓", label: "Help & Support", subtitle: "FAQ & contact", screen: "help" as ActiveScreen }
];

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<UserProfile | null>(getCurrentUser());
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("profile");

  useEffect(() => {
    return onAuthStateChanged((u) => setUser(u));
  }, []);

  const profileData = {
    name: user?.name || "Demo User",
    role: user?.role === "land_consultant" ? "Land Consultant" : "Landowner",
    region: "Kallapuram District",
    phone: user?.phone || "+91 98765 43210",
    email: user?.email || "demo@agrinova.app",
    parcelsManaged: 12,
    totalAcres: 245.5,
    avgHealthScore: 76
  };

  async function handleSignOut() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  }

  const handleBack = () => setActiveScreen("profile");

  // Render sub-screens
  if (activeScreen === "parcels") return <ParcelsScreen onBack={handleBack} />;
  if (activeScreen === "documents") return <DocumentsScreen onBack={handleBack} />;
  if (activeScreen === "notifications") return <NotificationsScreen onBack={handleBack} />;
  if (activeScreen === "settings") return <SettingsScreen onBack={handleBack} />;
  if (activeScreen === "help") return <HelpScreen onBack={handleBack} />;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
        </View>
        <Text style={styles.name}>{profileData.name}</Text>
        <View style={styles.roleChip}>
          <Text style={styles.roleText}>{profileData.role}</Text>
        </View>
        <Text style={styles.region}>📍 {profileData.region}</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileData.parcelsManaged}</Text>
            <Text style={styles.statLabel}>Parcels</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileData.totalAcres}</Text>
            <Text style={styles.statLabel}>Acres</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileData.avgHealthScore}</Text>
            <Text style={styles.statLabel}>Avg Health</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Contact Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📱</Text>
            <View>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profileData.phone}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>✉️</Text>
            <View>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profileData.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <React.Fragment key={item.label}>
              <Pressable style={styles.menuItem} onPress={() => setActiveScreen(item.screen)}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuContent}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </Pressable>
              {index < MENU_ITEMS.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutText}>🚪  Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg
  },
  header: {
    backgroundColor: palette.primary,
    alignItems: "center",
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32
  },
  avatarContainer: {
    position: "relative",
    marginBottom: spacing.sm
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: palette.accent
  },
  avatarText: {
    fontSize: 40
  },
  badge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: palette.primary
  },
  badgeText: {
    color: palette.surface,
    fontWeight: "700",
    fontSize: 14
  },
  name: {
    ...typography.h2,
    color: palette.surface,
    marginTop: spacing.xs
  },
  roleChip: {
    backgroundColor: palette.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: spacing.xs
  },
  roleText: {
    ...typography.small,
    color: palette.surface,
    fontWeight: "700"
  },
  region: {
    ...typography.caption,
    color: palette.surface,
    opacity: 0.85,
    marginTop: spacing.xs
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    marginTop: -20
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    ...shadows.sm
  },
  statValue: {
    ...typography.h2,
    color: palette.primary
  },
  statLabel: {
    ...typography.small,
    color: palette.muted,
    marginTop: 2
  },
  infoCard: {
    backgroundColor: palette.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm
  },
  infoTitle: {
    ...typography.bodyBold,
    color: palette.ink,
    marginBottom: spacing.sm
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  infoIcon: {
    fontSize: 22,
    width: 32
  },
  infoLabel: {
    ...typography.small,
    color: palette.muted
  },
  infoValue: {
    ...typography.body,
    color: palette.ink
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: spacing.xs
  },
  menuCard: {
    backgroundColor: palette.cardBg,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    overflow: "hidden",
    ...shadows.sm
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.sm
  },
  menuIcon: {
    fontSize: 24,
    width: 36
  },
  menuContent: {
    flex: 1
  },
  menuLabel: {
    ...typography.bodyBold,
    color: palette.ink
  },
  menuSubtitle: {
    ...typography.small,
    color: palette.muted
  },
  menuArrow: {
    fontSize: 24,
    color: palette.muted
  },
  menuDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginLeft: 60
  },
  logoutBtn: {
    marginTop: spacing.lg,
    alignItems: "center",
    paddingVertical: spacing.md
  },
  logoutText: {
    ...typography.bodyBold,
    color: palette.danger
  }
});
