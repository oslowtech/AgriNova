import React, { useState } from "react";
import { 
  FlatList, 
  Pressable, 
  StyleSheet, 
  Text, 
  View,
  RefreshControl
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, radius, shadows, spacing, typography } from "../theme";

type Parcel = {
  id: string;
  name: string;
  location: string;
  area: number;
  healthScore: number;
  status: "healthy" | "attention" | "critical";
  lastUpdated: string;
};

const DEMO_PARCELS: Parcel[] = [
  {
    id: "1",
    name: "North Field",
    location: "Kallapuram District",
    area: 45.5,
    healthScore: 82,
    status: "healthy",
    lastUpdated: "2 hours ago"
  },
  {
    id: "2",
    name: "River Valley Plot",
    location: "Thanjavur Region",
    area: 78.2,
    healthScore: 68,
    status: "attention",
    lastUpdated: "1 day ago"
  },
  {
    id: "3",
    name: "Highland Farm",
    location: "Coimbatore Area",
    area: 32.8,
    healthScore: 91,
    status: "healthy",
    lastUpdated: "3 hours ago"
  },
  {
    id: "4",
    name: "South Meadow",
    location: "Madurai District",
    area: 56.0,
    healthScore: 45,
    status: "critical",
    lastUpdated: "5 days ago"
  },
  {
    id: "5",
    name: "Eastern Fields",
    location: "Salem Region",
    area: 33.0,
    healthScore: 76,
    status: "healthy",
    lastUpdated: "6 hours ago"
  }
];

type Props = {
  onBack: () => void;
};

export function ParcelsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [parcels] = useState<Parcel[]>(DEMO_PARCELS);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status: Parcel["status"]) => {
    switch (status) {
      case "healthy": return palette.success;
      case "attention": return palette.warning;
      case "critical": return palette.danger;
    }
  };

  const getStatusIcon = (status: Parcel["status"]) => {
    switch (status) {
      case "healthy": return "✓";
      case "attention": return "!";
      case "critical": return "✕";
    }
  };

  const renderParcel = ({ item }: { item: Parcel }) => (
    <Pressable style={styles.parcelCard}>
      <View style={styles.parcelHeader}>
        <View style={styles.parcelInfo}>
          <Text style={styles.parcelName}>{item.name}</Text>
          <Text style={styles.parcelLocation}>📍 {item.location}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[styles.statusIcon, { color: getStatusColor(item.status) }]}>
            {getStatusIcon(item.status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.parcelStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.area}</Text>
          <Text style={styles.statLabel}>Acres</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: getStatusColor(item.status) }]}>
            {item.healthScore}
          </Text>
          <Text style={styles.statLabel}>Health</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>🕐</Text>
          <Text style={styles.statLabel}>{item.lastUpdated}</Text>
        </View>
      </View>
    </Pressable>
  );

  const totalArea = parcels.reduce((sum, p) => sum + p.area, 0);
  const avgHealth = Math.round(parcels.reduce((sum, p) => sum + p.healthScore, 0) / parcels.length);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>My Parcels</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{parcels.length}</Text>
          <Text style={styles.summaryLabel}>Total Parcels</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalArea.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>Total Acres</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{avgHealth}</Text>
          <Text style={styles.summaryLabel}>Avg Health</Text>
        </View>
      </View>

      <FlatList
        data={parcels}
        renderItem={renderParcel}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
  summary: {
    flexDirection: "row",
    backgroundColor: palette.primary,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  summaryItem: {
    flex: 1,
    alignItems: "center"
  },
  summaryValue: {
    ...typography.h2,
    color: palette.surface
  },
  summaryLabel: {
    ...typography.small,
    color: palette.surface,
    opacity: 0.8,
    marginTop: 2
  },
  summaryDivider: {
    width: 1,
    backgroundColor: palette.surface,
    opacity: 0.3
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100
  },
  parcelCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm
  },
  parcelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm
  },
  parcelInfo: {
    flex: 1
  },
  parcelName: {
    ...typography.bodyBold,
    color: palette.ink
  },
  parcelLocation: {
    ...typography.small,
    color: palette.muted,
    marginTop: 2
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  statusIcon: {
    fontSize: 16,
    fontWeight: "700"
  },
  parcelStats: {
    flexDirection: "row",
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm
  },
  stat: {
    flex: 1,
    alignItems: "center"
  },
  statValue: {
    ...typography.bodyBold,
    color: palette.ink
  },
  statLabel: {
    ...typography.small,
    color: palette.muted,
    marginTop: 2
  },
  statDivider: {
    width: 1,
    backgroundColor: palette.border
  }
});
