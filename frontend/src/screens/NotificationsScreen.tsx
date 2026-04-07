import React, { useState } from "react";
import { 
  FlatList, 
  Pressable, 
  StyleSheet, 
  Text, 
  View 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, radius, shadows, spacing, typography } from "../theme";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "alert" | "info" | "success" | "warning";
  time: string;
  read: boolean;
  parcel?: string;
};

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Health Score Drop Detected",
    message: "South Meadow health score dropped by 15 points. Consider irrigation review.",
    type: "alert",
    time: "2 hours ago",
    read: false,
    parcel: "South Meadow"
  },
  {
    id: "2",
    title: "New Report Available",
    message: "Your Q1 2026 Land Health Report is ready to download.",
    type: "info",
    time: "5 hours ago",
    read: false
  },
  {
    id: "3",
    title: "Optimal Planting Window",
    message: "Weather conditions are ideal for planting in North Field this week.",
    type: "success",
    time: "1 day ago",
    read: true,
    parcel: "North Field"
  },
  {
    id: "4",
    title: "Rainfall Alert",
    message: "Heavy rainfall expected in the next 48 hours. Review drainage systems.",
    type: "warning",
    time: "2 days ago",
    read: true
  },
  {
    id: "5",
    title: "NDVI Analysis Complete",
    message: "Latest satellite imagery processed. View updated zone maps.",
    type: "info",
    time: "3 days ago",
    read: true
  },
  {
    id: "6",
    title: "Valuation Updated",
    message: "Land valuation for Highland Farm has been updated based on recent market data.",
    type: "success",
    time: "5 days ago",
    read: true,
    parcel: "Highland Farm"
  }
];

type Props = {
  onBack: () => void;
};

export function NotificationsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);

  const getTypeIcon = (type: Notification["type"]) => {
    switch (type) {
      case "alert": return "🚨";
      case "info": return "ℹ️";
      case "success": return "✅";
      case "warning": return "⚠️";
    }
  };

  const getTypeColor = (type: Notification["type"]) => {
    switch (type) {
      case "alert": return palette.danger;
      case "info": return palette.info;
      case "success": return palette.success;
      case "warning": return palette.warning;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotification = ({ item }: { item: Notification }) => (
    <Pressable 
      style={[styles.notifCard, !item.read && styles.notifCardUnread]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={[styles.iconWrap, { backgroundColor: getTypeColor(item.type) + "15" }]}>
        <Text style={styles.icon}>{getTypeIcon(item.type)}</Text>
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifHeader}>
          <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
        <View style={styles.notifMeta}>
          <Text style={styles.notifTime}>{item.time}</Text>
          {item.parcel && (
            <Text style={styles.notifParcel}>• {item.parcel}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllAsRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadText}>
            {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
          </Text>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
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
    width: 80
  },
  markAllBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  markAllText: {
    ...typography.small,
    color: palette.primary,
    fontWeight: "600"
  },
  unreadBanner: {
    backgroundColor: palette.primary + "10",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm
  },
  unreadText: {
    ...typography.small,
    color: palette.primary,
    fontWeight: "600",
    textAlign: "center"
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100
  },
  notifCard: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm
  },
  notifCardUnread: {
    backgroundColor: palette.primary + "08",
    borderLeftWidth: 3,
    borderLeftColor: palette.primary
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: {
    fontSize: 22
  },
  notifContent: {
    flex: 1
  },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  notifTitle: {
    ...typography.bodyBold,
    color: palette.ink,
    flex: 1
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary
  },
  notifMessage: {
    ...typography.caption,
    color: palette.muted,
    marginTop: 4,
    lineHeight: 20
  },
  notifMeta: {
    flexDirection: "row",
    marginTop: spacing.xs
  },
  notifTime: {
    ...typography.small,
    color: palette.subtle
  },
  notifParcel: {
    ...typography.small,
    color: palette.primary,
    marginLeft: 4
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md
  },
  emptyText: {
    ...typography.body,
    color: palette.muted
  }
});
