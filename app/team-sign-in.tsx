import { useRouter } from "expo-router";
import { useState } from "react";

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { findTeamByCredentials } from "../src/database/repositories/teamRepository";

import { useTeamStore } from "../src/stores";

import { useTheme } from "../src/theme";

export default function TeamSignIn() {
  const router = useRouter();

  const { theme } = useTheme();

  const setTeam = useTeamStore((s) => s.setTeam);

  const [teamName, setTeamName] = useState("");

  const [teamPin, setTeamPin] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    if (!teamName.trim()) {
      Alert.alert("Missing team name", "Please enter your team name.");

      return;
    }

    if (teamPin.length !== 4) {
      Alert.alert("Invalid PIN", "PIN must be exactly 4 digits.");

      return;
    }

    try {
      setIsLoading(true);

      const team = await findTeamByCredentials(teamName, teamPin);

      if (!team) {
        Alert.alert("Invalid credentials", "Incorrect team name or PIN.");

        return;
      }

      setTeam({
        team_id: String(team.team_id),

        team_name: team.team_name,

        grade_level: team.grade_level,

        discriminator: team.discriminator,

        members: team.members.map((member: any) => ({
          first_name: member.first_name,
        })),

        created_at: Date.now(),
      });

      router.replace("/home");
    } catch (error) {
      console.error("Failed to sign in:", error);

      Alert.alert("Error", "Could not sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            padding: theme.spacing.lg,
          },
        ]}
      >
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.primary,

              fontSize: theme.fontSize.xxl,
            },
          ]}
        >
          Team Sign In
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: theme.colors.textMuted,
            },
          ]}
        >
          Continue your team's STEMMLab journey.
        </Text>

        <View style={styles.form}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.text,
              },
            ]}
          >
            Team name
          </Text>

          <TextInput
            value={teamName}
            onChangeText={setTeamName}
            autoCapitalize="words"
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,

                borderColor: theme.colors.border,

                color: theme.colors.text,
              },
            ]}
          />

          <Text
            style={[
              styles.label,
              {
                color: theme.colors.text,
              },
            ]}
          >
            Team PIN
          </Text>

          <TextInput
            value={teamPin}
            onChangeText={setTeamPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="Enter 4-digit PIN"
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,

                borderColor: theme.colors.border,

                color: theme.colors.text,
              },
            ]}
          />

          <TouchableOpacity
            disabled={isLoading}
            style={[
              styles.primaryButton,
              {
                backgroundColor: theme.colors.primary,

                borderRadius: theme.radius.lg,

                opacity: isLoading ? 0.6 : 1,
              },
            ]}
            onPress={handleSignIn}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color: theme.colors.textOnPrimary,
                },
              ]}
            >
              {isLoading ? "Signing in..." : "Continue Team"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
  },

  title: {
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },

  subtitle: {
    marginBottom: 28,
    textAlign: "center",
    fontSize: 15,
  },

  form: {
    gap: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    paddingLeft: 4,
  },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },

  primaryButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 12,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
