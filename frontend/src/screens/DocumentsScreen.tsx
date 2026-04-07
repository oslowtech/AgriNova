import React, { useState } from "react";
import { 
  FlatList, 
  Pressable, 
  StyleSheet, 
  Text, 
  View,
  Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, radius, shadows, spacing, typography } from "../theme";

type Document = {
  id: string;
  name: string;
  type: "report" | "record" | "certificate" | "map";
  date: string;
  size: string;
  parcel?: string;
};

const DEMO_DOCUMENTS: Document[] = [
  {
    id: "1",
    name: "Land Health Report - Q1 2026",
    type: "report",
    date: "Apr 1, 2026",
    size: "2.4 MB",
    parcel: "North Field"
  },
  {
    id: "2",
    name: "Property Deed - North Field",
    type: "record",
    date: "Jan 15, 2024",
    size: "1.2 MB",
    parcel: "North Field"
  },
  {
    id: "3",
    name: "Soil Analysis Certificate",
    type: "certificate",
    date: "Mar 20, 2026",
    size: "856 KB",
    parcel: "River Valley Plot"
  },
  {
    id: "4",
    name: "NDVI Zone Map - March 2026",
    type: "map",
    date: "Mar 31, 2026",
    size: "3.1 MB",
    parcel: "Highland Farm"
  },
  {
    id: "5",
    name: "Valuation Report 2026",
    type: "report",
    date: "Feb 28, 2026",
    size: "1.8 MB"
  },
  {
    id: "6",
    name: "Water Rights Certificate",
    type: "certificate",
    date: "Dec 10, 2025",
    size: "540 KB",
    parcel: "River Valley Plot"
  }
];

type Props = {
  onBack: () => void;
};

export function DocumentsScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<string>("all");
  const [documents] = useState<Document[]>(DEMO_DOCUMENTS);

  const getTypeIcon = (type: Document["type"]) => {
    switch (type) {
      case "report": return "📊";
      case "record": return "📄";
      case "certificate": return "🏆";
      case "map": return "🗺️";
    }
  };

  const getTypeColor = (type: Document["type"]) => {
    switch (type) {
      case "report": return palette.info;
      case "record": return palette.primary;
      case "certificate": return palette.accent;
      case "map": return palette.success;
    }
  };

  const filteredDocs = filter === "all" 
    ? documents 
    : documents.filter(d => d.type === filter);

  const handleDownload = (doc: Document) => {
    Alert.alert(
      "Download",
      `Downloading "${doc.name}"...\n\nThis is a demo - actual download would start here.`,
      [{ text: "OK" }]
    );
  };

  const renderDocument = ({ item }: { item: Document }) => (
    <Pressable style={styles.docCard} onPress={() => handleDownload(item)}>
      <View style={[styles.iconWrap, { backgroundColor: getTypeColor(item.type) + "15" }]}>
        <Text style={styles.icon}>{getTypeIcon(item.type)}</Text>
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docName} numberOfLines={1}>{item.name}</Text>
        {item.parcel && (
          <Text style={styles.docParcel}>📍 {item.parcel}</Text>
        )}
        <View style={styles.docMeta}>
          <Text style={styles.docDate}>{item.date}</Text>
          <Text style={styles.docSize}>• {item.size}</Text>
        </View>
      </View>
      <View style={styles.downloadBtn}>
        <Text style={styles.downloadIcon}>↓</Text>
      </View>
    </Pressable>
  );

  const filters = [
    { key: "all", label: "All" },
    { key: "report", label: "Reports" },
    { key: "record", label: "Records" },
    { key: "certificate", label: "Certificates" },
    { key: "map", label: "Maps" }
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>Documents</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.filters}>
        {filters.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredDocs}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyText}>No documents found</Text>
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
    width: 40
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs
  },
  filterBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border
  },
  filterBtnActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary
  },
  filterText: {
    ...typography.small,
    color: palette.muted
  },
  filterTextActive: {
    color: palette.surface,
    fontWeight: "600"
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: {
    fontSize: 24
  },
  docInfo: {
    flex: 1
  },
  docName: {
    ...typography.bodyBold,
    color: palette.ink
  },
  docParcel: {
    ...typography.small,
    color: palette.primary,
    marginTop: 2
  },
  docMeta: {
    flexDirection: "row",
    marginTop: 4
  },
  docDate: {
    ...typography.small,
    color: palette.muted
  },
  docSize: {
    ...typography.small,
    color: palette.muted,
    marginLeft: 4
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.primary + "15",
    alignItems: "center",
    justifyContent: "center"
  },
  downloadIcon: {
    fontSize: 18,
    color: palette.primary,
    fontWeight: "700"
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
