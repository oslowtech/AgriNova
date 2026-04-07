import React, { useState } from "react";
import { 
  FlatList, 
  Pressable, 
  StyleSheet, 
  Text, 
  TextInput,
  View,
  Linking
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette, radius, shadows, spacing, typography } from "../theme";

type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

const FAQS: FAQ[] = [
  {
    id: "1",
    question: "How does the land health score work?",
    answer: "The land health score is calculated using satellite imagery (NDVI), soil data, rainfall patterns, and temperature. It ranges from 0-100, where higher scores indicate healthier land conditions.",
    category: "general"
  },
  {
    id: "2",
    question: "How accurate is the NDVI analysis?",
    answer: "Our NDVI analysis uses high-resolution satellite imagery updated every 5-7 days. Accuracy is typically 85-95% depending on weather conditions and cloud cover.",
    category: "general"
  },
  {
    id: "3",
    question: "How do I add a new parcel?",
    answer: "Go to My Parcels → tap the '+' button → draw boundaries on the map or enter coordinates manually. You can also upload a shapefile or KML file.",
    category: "parcels"
  },
  {
    id: "4",
    question: "Can I share reports with others?",
    answer: "Yes! Go to Documents → select a report → tap Share. You can share via email, WhatsApp, or generate a shareable link.",
    category: "documents"
  },
  {
    id: "5",
    question: "How is land valuation calculated?",
    answer: "Land valuation considers multiple factors: land health score, location, nearby amenities, market trends, soil quality, water availability, and recent comparable sales in the area.",
    category: "valuation"
  },
  {
    id: "6",
    question: "Why am I not receiving notifications?",
    answer: "Check that notifications are enabled in Settings → Notifications. Also verify your phone's notification settings for AgriNova app. Make sure Do Not Disturb is not enabled.",
    category: "notifications"
  },
  {
    id: "7",
    question: "How do I change my phone number?",
    answer: "Go to Profile → tap on your phone number → verify ownership with OTP → enter new number → verify new number with OTP.",
    category: "account"
  },
  {
    id: "8",
    question: "Is my data secure?",
    answer: "Yes! We use end-to-end encryption for all data. Your information is stored on secure servers and we never share your data with third parties without consent.",
    category: "privacy"
  },
  {
    id: "9",
    question: "What do the zone colors mean?",
    answer: "Dense (green) = healthy vegetation. Healthy (light green) = good condition. Sparse (yellow) = needs attention. Stressed (red) = requires immediate action.",
    category: "general"
  },
  {
    id: "10",
    question: "How often is satellite data updated?",
    answer: "Satellite imagery is typically updated every 5-7 days, weather permitting. During cloudy periods, updates may be delayed. We always show the latest available data.",
    category: "general"
  }
];

type Props = {
  onBack: () => void;
};

export function HelpScreen({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFAQs = FAQS.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleEmailSupport = () => {
    Linking.openURL("mailto:support@agrinova.app?subject=Help Request");
  };

  const handleCallSupport = () => {
    Linking.openURL("tel:+919876543210");
  };

  const renderFAQ = ({ item }: { item: FAQ }) => (
    <Pressable 
      style={styles.faqCard}
      onPress={() => toggleExpand(item.id)}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Text style={styles.faqToggle}>
          {expandedId === item.id ? "−" : "+"}
        </Text>
      </View>
      {expandedId === item.id && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search FAQs..."
          placeholderTextColor={palette.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredFAQs}
        renderItem={renderFAQ}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptyHint}>Try different keywords</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Still need help?</Text>
            <View style={styles.contactCard}>
              <Text style={styles.contactTitle}>Contact Support</Text>
              <Text style={styles.contactDesc}>
                Our team is available Monday to Saturday, 9 AM to 6 PM IST.
              </Text>
              
              <View style={styles.contactButtons}>
                <Pressable style={styles.contactBtn} onPress={handleEmailSupport}>
                  <Text style={styles.contactBtnIcon}>✉️</Text>
                  <Text style={styles.contactBtnText}>Email Us</Text>
                </Pressable>
                <Pressable style={[styles.contactBtn, styles.contactBtnPrimary]} onPress={handleCallSupport}>
                  <Text style={styles.contactBtnIcon}>📞</Text>
                  <Text style={[styles.contactBtnText, styles.contactBtnTextPrimary]}>Call Us</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>📚 Documentation</Text>
              <Text style={styles.infoText}>
                Visit our website for detailed guides, video tutorials, and API documentation.
              </Text>
              <Pressable 
                style={styles.linkBtn}
                onPress={() => Linking.openURL("https://agrinova.app/docs")}
              >
                <Text style={styles.linkText}>Visit Documentation →</Text>
              </Pressable>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>💬 Community</Text>
              <Text style={styles.infoText}>
                Join our community of farmers and land consultants to share experiences and get tips.
              </Text>
              <Pressable 
                style={styles.linkBtn}
                onPress={() => Linking.openURL("https://community.agrinova.app")}
              >
                <Text style={styles.linkText}>Join Community →</Text>
              </Pressable>
            </View>
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    ...shadows.sm
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.sm
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: palette.ink
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100
  },
  sectionTitle: {
    ...typography.small,
    color: palette.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md
  },
  faqCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  faqQuestion: {
    ...typography.bodyBold,
    color: palette.ink,
    flex: 1,
    paddingRight: spacing.sm
  },
  faqToggle: {
    fontSize: 20,
    color: palette.primary,
    fontWeight: "700"
  },
  faqAnswer: {
    ...typography.body,
    color: palette.muted,
    marginTop: spacing.sm,
    lineHeight: 22
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm
  },
  emptyText: {
    ...typography.bodyBold,
    color: palette.ink
  },
  emptyHint: {
    ...typography.small,
    color: palette.muted,
    marginTop: 4
  },
  contactSection: {
    marginTop: spacing.lg
  },
  contactCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm
  },
  contactTitle: {
    ...typography.h3,
    color: palette.ink,
    marginBottom: spacing.xs
  },
  contactDesc: {
    ...typography.body,
    color: palette.muted,
    marginBottom: spacing.md
  },
  contactButtons: {
    flexDirection: "row",
    gap: spacing.sm
  },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceAlt,
    gap: spacing.xs
  },
  contactBtnPrimary: {
    backgroundColor: palette.primary
  },
  contactBtnIcon: {
    fontSize: 18
  },
  contactBtnText: {
    ...typography.bodyBold,
    color: palette.ink
  },
  contactBtnTextPrimary: {
    color: palette.surface
  },
  infoCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    ...shadows.sm
  },
  infoTitle: {
    ...typography.bodyBold,
    color: palette.ink,
    marginBottom: spacing.xs
  },
  infoText: {
    ...typography.caption,
    color: palette.muted,
    lineHeight: 20
  },
  linkBtn: {
    marginTop: spacing.sm
  },
  linkText: {
    ...typography.caption,
    color: palette.primary,
    fontWeight: "600"
  }
});
