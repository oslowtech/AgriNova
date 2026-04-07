import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, radius, shadows, spacing, typography } from "../theme";

type Props = {
  score: number;
  label: string;
  confidence: number;
};

function barColor(score: number) {
  if (score >= 70) return palette.healthy;
  if (score >= 45) return palette.sparse;
  return palette.stressed;
}

function getStatusEmoji(label: string) {
  if (label.toLowerCase().includes("healthy")) return "🌿";
  if (label.toLowerCase().includes("moderate")) return "🌾";
  return "⚠️";
}

export function HealthGauge({ score, label, confidence }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.heading}>Land Health Score</Text>
        <View style={styles.badgeWrap}>
          <Text style={styles.emoji}>{getStatusEmoji(label)}</Text>
          <Text style={styles.badge}>{label}</Text>
        </View>
      </View>
      
      <View style={styles.scoreContainer}>
        <Text style={styles.score}>{score.toFixed(0)}</Text>
        <Text style={styles.scoreMax}>/100</Text>
      </View>

      <View style={styles.barBg}>
        <View style={[styles.bar, { width: `${Math.max(0, Math.min(100, score))}%`, backgroundColor: barColor(score) }]} />
      </View>

      <View style={styles.footer}>
        <View style={styles.confContainer}>
          <Text style={styles.confIcon}>📊</Text>
          <Text style={styles.confText}>Confidence: {(confidence * 100).toFixed(0)}%</Text>
        </View>
        <Text style={styles.indicator}>
          {score >= 70 ? "▲ Good" : score >= 45 ? "▬ Fair" : "▼ Low"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.cardBg,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  heading: {
    ...typography.bodyBold,
    color: palette.ink
  },
  badgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 4
  },
  emoji: {
    fontSize: 14
  },
  badge: {
    ...typography.small,
    color: palette.surface,
    fontWeight: "700"
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.sm
  },
  score: {
    fontSize: 48,
    fontWeight: "800",
    color: palette.primary
  },
  scoreMax: {
    ...typography.body,
    color: palette.muted,
    marginLeft: 4
  },
  barBg: {
    height: 10,
    backgroundColor: palette.border,
    borderRadius: radius.full,
    overflow: "hidden"
  },
  bar: {
    height: "100%",
    borderRadius: radius.full
  },
  footer: {
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  confContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  confIcon: {
    fontSize: 14
  },
  confText: {
    ...typography.small,
    color: palette.muted
  },
  indicator: {
    ...typography.small,
    color: palette.accent,
    fontWeight: "700"
  }
});
