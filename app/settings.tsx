import { useRouter } from "expo-router";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../src/theme";

export default function Settings() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

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
            {
              color: theme.colors.primary,
              fontSize: theme.fontSize.display,
            },
          ]}
        >
          Settings
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: theme.colors.textMuted,
              fontSize: theme.fontSize.sm,
            },
          ]}
        >
          SCRUM-29 will build this
        </Text>
      </View>

      {/* Settings Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.xl,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {/* Appearance Section */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.textMuted,
            },
          ]}
        >
          Appearance
        </Text>

        <View
          style={[
            styles.settingRow,
            {
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.settingText,
              {
                color: theme.colors.primary,
              },
            ]}
          >
            Dark Mode
          </Text>

          <Switch onValueChange={toggleTheme} />
        </View>

        {/* Future Placeholder */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.textMuted,
              marginTop: 24,
            },
          ]}
        >
          Accessibility
        </Text>

        <View
          style={[
            styles.settingRow,
            {
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.settingText,
              {
                color: theme.colors.primary,
              },
            ]}
          >
            Voice Guidance
          </Text>

          <Switch value={false} disabled />
        </View>

        {/* About */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: theme.colors.textMuted,
              marginTop: 24,
            },
          ]}
        >
          About
        </Text>

        <View style={styles.settingRow}>
          <Text
            style={[
              styles.settingText,
              {
                color: theme.colors.primary,
              },
            ]}
          >
            STEMMLab v1.0
          </Text>
        </View>
      </View>

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text
          style={[
            styles.backText,
            {
              color: theme.colors.primary,
            },
          ]}
        >
          ← Back
        </Text>
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

  backButton: {
    marginTop: 32,
    alignSelf: "center",
  },

  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
