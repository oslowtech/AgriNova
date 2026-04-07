import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, radius, shadows, spacing, typography } from "../theme";

type Props = {
  title: string;
  value: number;
  suffix?: string;
  icon?: string;
};

export function MetricCard({ title, value, suffix = "", icon = "📈" }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>
        {value.toFixed(1)}
        <Text style={styles.suffix}>{suffix}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: palette.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs
  },
  icon: {
    fontSize: 16
  },
  title: {
    ...typography.small,
    color: palette.muted
  },
  value: {
    fontSize: 26,
    color: palette.primary,
    fontWeight: "800"
  },
  suffix: {
    ...typography.body,
    color: palette.muted,
    fontWeight: "500"
  }
});
