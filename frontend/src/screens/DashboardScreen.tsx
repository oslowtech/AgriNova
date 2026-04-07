import React, { useEffect, useMemo, useState } from "react";
import { 
  ActivityIndicator, 
  RefreshControl, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View,
  Pressable
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchLandHealth, fetchValuation, fetchZoneMap } from "../api/client";
import { useUser } from "../services/UserContext";
import { useLanguage } from "../services/LanguageContext";
import { getParcelsForUser, getParcelHealth, getParcelValuation } from "../services/database_temp";
import { HealthGauge } from "../components/HealthGauge";
import { MetricCard } from "../components/MetricCard";
import { ZoneLegend } from "../components/ZoneLegend";
import { palette, radius, shadows, spacing, typography } from "../theme";
import { LandHealth, Valuation, ZoneMap } from "../types";

const DEMO_LAT = 12.9716;
const DEMO_LNG = 77.5946;

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, permissions } = useUser();
  const { t } = useLanguage();
  const [health, setHealth] = useState<LandHealth | null>(null);
  const [zone, setZone] = useState<ZoneMap | null>(null);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [parcels, setParcels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setError(null);
      
      // Load user's parcels based on role
      if (user) {
        const userParcels = await getParcelsForUser(user.uid, user.role);
        setParcels(userParcels);
      }
      
      // For demo, still load default data
      const [healthData, zoneData, valuationData] = await Promise.all([
        fetchLandHealth(DEMO_LAT, DEMO_LNG),
        fetchZoneMap(DEMO_LAT, DEMO_LNG),
        fetchValuation(DEMO_LAT, DEMO_LNG)
      ]);
      setHealth(healthData);
      setZone(zoneData);
      setValuation(valuationData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const metrics = useMemo(() => {
    if (!health) return [];
    return [
      { title: "NDVI Index", value: health.ndvi, icon: "🌿", suffix: "" },
      { title: "Rainfall", value: health.rainfall, icon: "🌧️", suffix: " mm" },
      { title: "Soil Health", value: health.soil, icon: "🪨", suffix: "" },
      { title: "Temperature", value: health.temperature, icon: "🌡️", suffix: "°C" }
    ];
  }, [health]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Loading land data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning 👋</Text>
          <Text style={styles.title}>
            {permissions.viewAllParcels ? 'Land Management Dashboard' : 'My Land Dashboard'}
          </Text>
          {user && (
            <Text style={styles.roleText}>
              {user.role === 'land_consultant' ? 'Land Consultant' : 'Landowner'} • {parcels.length} parcel{parcels.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <Pressable style={styles.refreshBtn} onPress={() => { setRefreshing(true); void load(); }}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); void load(); }}
            tintColor={palette.primary}
          />
        }
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {health && (
          <>
            <HealthGauge 
              score={health.score} 
              label={health.label} 
              confidence={health.confidence} 
            />

            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.grid}>
              {metrics.map((metric) => (
                <MetricCard 
                  key={metric.title} 
                  title={metric.title} 
                  value={metric.value}
                  icon={metric.icon}
                  suffix={metric.suffix}
                />
              ))}
            </View>
          </>
        )}

        {zone && (
          <>
            <Text style={styles.sectionTitle}>NDVI Zone Distribution</Text>
            <ZoneLegend data={zone} />
          </>
        )}

        {valuation && (
          <View style={styles.valuationCard}>
            <View style={styles.valuationHeader}>
              <Text style={styles.valuationIcon}>💰</Text>
              <Text style={styles.valuationTitle}>Estimated Valuation</Text>
            </View>
            <View style={styles.valuationGrid}>
              <View style={styles.valuationItem}>
                <Text style={styles.valuationLabel}>Low</Text>
                <Text style={styles.valuationValue}>
                  {valuation.currency} {valuation.low.toLocaleString()}
                </Text>
              </View>
              <View style={[styles.valuationItem, styles.valuationItemHighlight]}>
                <Text style={styles.valuationLabel}>Mid</Text>
                <Text style={[styles.valuationValue, styles.valuationValueHighlight]}>
                  {valuation.currency} {valuation.mid.toLocaleString()}
                </Text>
              </View>
              <View style={styles.valuationItem}>
                <Text style={styles.valuationLabel}>High</Text>
                <Text style={styles.valuationValue}>
                  {valuation.currency} {valuation.high.toLocaleString()}
                </Text>
              </View>
            </View>
            <Text style={styles.valuationNote}>
              Based on AI analysis • Not a legal valuation
            </Text>
          </View>
        )}

        {/* Quick Actions based on role */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {permissions.createParcels && (
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionText}>Create Parcel</Text>
            </Pressable>
          )}
          {permissions.uploadDocuments && (
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionIcon}>📄</Text>
              <Text style={styles.actionText}>Upload Documents</Text>
            </Pressable>
          )}
          {permissions.manageUsers && (
            <Pressable style={styles.actionButton}>
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionText}>Invite Landowner</Text>
            </Pressable>
          )}
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>View Reports</Text>
          </Pressable>
        </View>

        <View style={{ height: 100 }} />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  greeting: {
    ...typography.caption,
    color: palette.muted,
    marginBottom: 2
  },
  title: {
    ...typography.h2,
    color: palette.ink
  },
  roleText: {
    ...typography.caption,
    color: palette.muted,
    marginTop: 2
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm
  },
  refreshIcon: {
    fontSize: 20
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.bg,
    gap: spacing.md
  },
  loadingText: {
    ...typography.caption,
    color: palette.muted
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm
  },
  errorIcon: {
    fontSize: 20
  },
  errorText: {
    flex: 1,
    ...typography.caption,
    color: palette.danger
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: palette.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.sm
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  valuationCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.md
  },
  valuationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  valuationIcon: {
    fontSize: 24
  },
  valuationTitle: {
    ...typography.h3,
    color: palette.ink
  },
  valuationGrid: {
    flexDirection: "row",
    gap: spacing.sm
  },
  valuationItem: {
    flex: 1,
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: "center"
  },
  valuationItemHighlight: {
    backgroundColor: palette.primary + "10",
    borderWidth: 1,
    borderColor: palette.primary + "30"
  },
  valuationLabel: {
    ...typography.small,
    color: palette.muted,
    marginBottom: 4
  },
  valuationValue: {
    ...typography.bodyBold,
    color: palette.ink
  },
  valuationValueHighlight: {
    color: palette.primary
  },
  valuationNote: {
    ...typography.small,
    color: palette.subtle,
    textAlign: "center",
    marginTop: spacing.md
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  actionButton: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: palette.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.xs,
    ...shadows.sm
  },
  actionIcon: {
    fontSize: 24
  },
  actionText: {
    ...typography.caption,
    color: palette.ink,
    fontWeight: "600",
    textAlign: "center"
  }
});
