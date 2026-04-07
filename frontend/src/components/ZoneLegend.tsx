import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, radius, shadows, spacing, typography } from "../theme";
import { ZoneMap } from "../types";

const zoneConfig = [
  { key: "dense", label: "Dense", color: palette.dense, icon: "🌳" },
  { key: "healthy", label: "Healthy", color: palette.healthy, icon: "🌿" },
  { key: "sparse", label: "Sparse", color: palette.sparse, icon: "🌾" },
  { key: "stressed", label: "Stressed", color: palette.stressed, icon: "⚠️" }
] as const;

type Props = { data: ZoneMap };

export function ZoneLegend({ data }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🗺️</Text>
        <Text style={styles.title}>Zone Distribution</Text>
      </View>
      
      {zoneConfig.map((zone) => {
        const value = data.percentages[zone.key] ?? 0;
        return (
          <View key={zone.key} style={styles.row}>
            <View style={styles.labelContainer}>
              <Text style={styles.icon}>{zone.icon}</Text>
              <Text style={styles.label}>{zone.label}</Text>
            </View>
            <View style={styles.barContainer}>
              <View style={styles.barBg}>
                <View style={[styles.bar, { width: `${value}%`, backgroundColor: zone.color }]} />
              </View>
              <Text style={[styles.value, { color: zone.color }]}>{value.toFixed(0)}%</Text>
            </View>
          </View>
        );
      })}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Based on NDVI satellite analysis</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.cardBg,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.border
  },
  headerIcon: {
    fontSize: 20
  },
  title: {
    ...typography.bodyBold,
    color: palette.ink
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  labelContainer: {
    width: 90,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  icon: {
    fontSize: 16
  },
  label: {
    ...typography.small,
    color: palette.ink,
    fontWeight: "600"
  },
  barContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  barBg: {
    flex: 1,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: palette.border,
    overflow: "hidden"
  },
  bar: {
    height: "100%",
    borderRadius: radius.full
  },
  value: {
    width: 40,
    textAlign: "right",
    ...typography.small,
    fontWeight: "700"
  },
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    alignItems: "center"
  },
  footerText: {
    ...typography.caption,
    color: palette.muted
  }
});
