import { useRouter } from "expo-router";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../src/theme";

export default function Settings() {
  const router = useRouter();
  const { theme, toggleTheme, isDark } = useTheme();

  // Theme helpers
  const textPrimary = { color: theme.colors.primary };
  const textMuted = { color: theme.colors.textMuted };

  const cardStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderColor: theme.colors.border,
  };

  const rowBorder = {
    borderBottomColor: theme.colors.border,
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          padding: theme.spacing.lg,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            textPrimary,
            {
              fontSize: theme.fontSize.display,
            },
          ]}
        >
          Settings
        </Text>

        <Text
          style={[
            styles.subtitle,
            textMuted,
            {
              fontSize: theme.fontSize.sm,
            },
          ]}
        >
          SCRUM-29 will build this
        </Text>
      </View>

      {/* Settings Card */}
      <View style={[styles.card, cardStyle]}>
        {/* Appearance */}
        <Text style={[styles.sectionTitle, textMuted]}>Appearance</Text>

        <View style={[styles.settingRow, rowBorder]}>
          <Text style={[styles.settingText, textPrimary]}>Dark Mode</Text>

          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{
              false: "#D1D5DB",
              true: theme.colors.primarySoft,
            }}
            thumbColor={isDark ? theme.colors.primary : "#FFFFFF"}
          />
        </View>

        {/* Accessibility */}
        <Text style={[styles.sectionTitle, textMuted, styles.sectionSpacing]}>
          Accessibility
        </Text>

        <View style={[styles.settingRow, rowBorder]}>
          <Text style={[styles.settingText, textMuted, styles.italicText]}>
            SCRUM-29 will build this
          </Text>
        </View>

        {/* About */}
        <Text style={[styles.sectionTitle, textMuted, styles.sectionSpacing]}>
          About
        </Text>

        <View style={[styles.settingRow, rowBorder]}>
          <Text style={[styles.settingText, textPrimary]}>STEMMLab v1.0</Text>
        </View>
      </View>

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={router.back}>
        <Text style={[styles.backText, textPrimary]}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
  },

  header: {
    marginBottom: 32,
  },

  title: {
    fontWeight: "700",
    marginBottom: 8,
  },

  subtitle: {},

  card: {
    borderWidth: 1,
    padding: 20,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  sectionSpacing: {
    marginTop: 24,
  },

  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },

  settingText: {
    fontSize: 16,
    fontWeight: "500",
  },

  italicText: {
    fontStyle: "italic",
  },

  backButton: {
    marginTop: 32,
    alignSelf: "center",
  },

  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
