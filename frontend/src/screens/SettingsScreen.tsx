import React, { useState } from "react";
import { 
  Alert,
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Switch,
  Text, 
  View 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage, Language } from "../services/LanguageContext";
import { palette, radius, shadows, spacing, typography } from "../theme";

type Props = {
  onBack: () => void;
};

export function SettingsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage } = useLanguage();
  
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [locationAccess, setLocationAccess] = useState(true);
  const [cameraAccess, setCameraAccess] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [biometricLock, setBiometricLock] = useState(false);

  const handleLanguageSelect = () => {
    Alert.alert(
      t("selectLanguage"),
      "",
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("english"), onPress: () => setLanguage("en" as Language) },
        { text: t("tamil"), onPress: () => setLanguage("ta" as Language) }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      t("clearCache"),
      t("clearCacheConfirm"),
      [
        { text: t("cancel"), style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive",
          onPress: () => Alert.alert("Success", "Cache cleared successfully!")
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      "Export Data",
      "Your data will be exported as a JSON file.",
      [
        { text: t("cancel"), style: "cancel" },
        { 
          text: "Export", 
          onPress: () => Alert.alert("Success", "Data exported successfully!")
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your data will be permanently deleted.",
      [
        { text: t("cancel"), style: "cancel" },
        { 
          text: t("delete"), 
          style: "destructive",
          onPress: () => Alert.alert("Demo Mode", "Account deletion is disabled in demo mode.")
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>{t("settings")}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Language */}
        <Text style={styles.sectionTitle}>{t("appSettings")}</Text>
        <View style={styles.card}>
          <Pressable style={styles.actionRow} onPress={handleLanguageSelect}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🌐</Text>
              <View>
                <Text style={styles.settingLabel}>{t("language")}</Text>
                <Text style={styles.settingDesc}>
                  {language === "en" ? t("english") : t("tamil")}
                </Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🌙</Text>
              <View>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDesc}>Use dark theme</Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor={palette.surface}
            />
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>{t("notifications_settings")}</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View>
                <Text style={styles.settingLabel}>{t("enableNotifications")}</Text>
                <Text style={styles.settingDesc}>Receive alerts & updates</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor={palette.surface}
            />
          </View>
        </View>

        {/* Permissions */}
        <Text style={styles.sectionTitle}>Permissions</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>📍</Text>
              <View>
                <Text style={styles.settingLabel}>Location Access</Text>
                <Text style={styles.settingDesc}>For parcel mapping</Text>
              </View>
            </View>
            <Switch
              value={locationAccess}
              onValueChange={setLocationAccess}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor={palette.surface}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>📷</Text>
              <View>
                <Text style={styles.settingLabel}>Camera Access</Text>
                <Text style={styles.settingDesc}>For document scanning</Text>
              </View>
            </View>
            <Switch
              value={cameraAccess}
              onValueChange={setCameraAccess}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor={palette.surface}
            />
          </View>
        </View>

        {/* Data & Security */}
        <Text style={styles.sectionTitle}>Data & Security</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔄</Text>
              <View>
                <Text style={styles.settingLabel}>Auto Sync</Text>
                <Text style={styles.settingDesc}>Sync data automatically</Text>
              </View>
            </View>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor={palette.surface}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔐</Text>
              <View>
                <Text style={styles.settingLabel}>Biometric Lock</Text>
                <Text style={styles.settingDesc}>Use fingerprint/face to unlock</Text>
              </View>
            </View>
            <Switch
              value={biometricLock}
              onValueChange={setBiometricLock}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor={palette.surface}
            />
          </View>
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Data Management</Text>
        <View style={styles.card}>
          <Pressable style={styles.actionRow} onPress={handleClearCache}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🗑️</Text>
              <View>
                <Text style={styles.settingLabel}>Clear Cache</Text>
                <Text style={styles.settingDesc}>Free up storage space</Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.actionRow} onPress={handleExportData}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>📤</Text>
              <View>
                <Text style={styles.settingLabel}>Export Data</Text>
                <Text style={styles.settingDesc}>Download your data</Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: palette.danger }]}>Danger Zone</Text>
        <View style={[styles.card, { borderColor: palette.danger + "30", borderWidth: 1 }]}>
          <Pressable style={styles.actionRow} onPress={handleDeleteAccount}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>⚠️</Text>
              <View>
                <Text style={[styles.settingLabel, { color: palette.danger }]}>Delete Account</Text>
                <Text style={styles.settingDesc}>Permanently delete all data</Text>
              </View>
            </View>
            <Text style={[styles.arrow, { color: palette.danger }]}>›</Text>
          </Pressable>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>GeoInsight</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm
  },
  backIcon: {
    fontSize: 20,
    color: palette.ink
  },
  title: {
    ...typography.h2,
    color: palette.ink
  },
  placeholder: {
    width: 40
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md
  },
  sectionTitle: {
    ...typography.small,
    color: palette.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadows.sm
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1
  },
  settingIcon: {
    fontSize: 24,
    width: 32
  },
  settingLabel: {
    ...typography.bodyBold,
    color: palette.ink
  },
  settingDesc: {
    ...typography.small,
    color: palette.muted,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginLeft: 56
  },
  arrow: {
    fontSize: 24,
    color: palette.muted
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginTop: spacing.lg
  },
  appName: {
    ...typography.bodyBold,
    color: palette.primary
  },
  appVersion: {
    ...typography.small,
    color: palette.muted,
    marginTop: 2
  }
});
