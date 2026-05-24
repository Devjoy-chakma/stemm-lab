import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useTheme } from "../src/theme";

export default function Welcome() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.primary,
            fontSize: theme.fontSize.hero,
          },
        ]}
      >
        STEMMLab
      </Text>

      <Text
        style={[
          styles.subtitle,
          {
            color: theme.colors.textMuted,
            fontSize: theme.fontSize.md,
          },
        ]}
      >
        Team-based STEMM challenges for Years 3–9.
      </Text>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.lg,
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.md,
          },
        ]}
        onPress={() => router.push("/team-sign-in")}
      >
        <Text
          style={[
            styles.buttonText,
            {
              color: theme.colors.textOnPrimary,
            },
          ]}
        >
          Team Sign In
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.secondaryButton,
          {
            borderColor: theme.colors.primary,
            borderRadius: theme.radius.lg,
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.md,
          },
        ]}
        onPress={() => router.push("/team-sign-up")}
      >
        <Text
          style={[
            styles.secondaryText,
            {
              color: theme.colors.primary,
            },
          ]}
        >
          Team Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontWeight: "700",
    marginBottom: 12,
  },

  subtitle: {
    marginBottom: 48,
    textAlign: "center",
  },

  primaryButton: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },

  secondaryButton: {
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
