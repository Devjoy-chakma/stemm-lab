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

import { createTeamSession } from "../src/database/repositories/teamRepository";
import { useTeamStore } from "../src/stores";
import { useTheme } from "../src/theme";

export default function TeamSignUp() {
  const router = useRouter();

  const { theme } = useTheme();

  const setTeam = useTeamStore((s) => s.setTeam);

  const [teamName, setTeamName] = useState("");

  const [gradeLevel, setGradeLevel] = useState("");

  const [members, setMembers] = useState(["", ""]);

  const [teamPin, setTeamPin] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  function updateMember(index: number, value: string) {
    const nextMembers = [...members];

    nextMembers[index] = value;

    setMembers(nextMembers);
  }

  function addMember() {
    if (members.length >= 4) {
      Alert.alert("Limit reached", "A team can have up to 4 members.");

      return;
    }

    setMembers([...members, ""]);
  }

  function removeMember(index: number) {
    if (members.length <= 1) return;

    setMembers(members.filter((_, memberIndex) => memberIndex !== index));
  }

  async function handleCreateTeam() {
    const cleanTeamName = teamName.trim();

    const cleanMembers = members.map((name) => name.trim()).filter(Boolean);

    const numericGrade = Number(gradeLevel);

    if (cleanTeamName.length < 2 || cleanTeamName.length > 20) {
      Alert.alert("Invalid team name", "Team name must be 2–20 characters.");

      return;
    }

    if (
      !Number.isInteger(numericGrade) ||
      numericGrade < 3 ||
      numericGrade > 9
    ) {
      Alert.alert("Invalid grade", "Grade level must be between 3 and 9.");

      return;
    }

    if (cleanMembers.length === 0) {
      Alert.alert("Missing members", "Add at least one team member.");

      return;
    }

    if (teamPin.length !== 4) {
      Alert.alert("Invalid PIN", "PIN must be exactly 4 digits.");

      return;
    }

    try {
      setIsSaving(true);

      const { teamId, discriminator } = await createTeamSession({
        userId: 1,
        teamName: cleanTeamName,
        gradeLevel: numericGrade,
        memberNames: cleanMembers,
      });

      setTeam({
        team_id: String(teamId),
        team_name: cleanTeamName,
        grade_level: numericGrade,
        discriminator,
        members: cleanMembers.map((first_name) => ({
          first_name,
        })),
        created_at: Date.now(),
      });

      router.replace("/home");
    } catch (error) {
      console.error("Failed to create team:", error);

      Alert.alert("Error", "Could not create team. Please try again.");
    } finally {
      setIsSaving(false);
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
          Team Sign Up
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: theme.colors.textMuted,
            },
          ]}
        >
          Create a team to save activity progress and leaderboard scores.
        </Text>

        <View style={styles.form}>
          <View style={styles.topRow}>
            <View style={styles.teamNameContainer}>
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
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,

                    borderColor: theme.colors.border,

                    color: theme.colors.text,
                  },
                ]}
              />
            </View>

            <View style={styles.gradeContainer}>
              <Text
                style={[
                  styles.label,
                  {
                    color: theme.colors.text,
                  },
                ]}
              >
                Grade
              </Text>

              <TextInput
                value={gradeLevel}
                onChangeText={setGradeLevel}
                keyboardType="number-pad"
                placeholder="3–9"
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
            </View>
          </View>

          <Text
            style={[
              styles.label,
              {
                color: theme.colors.text,
              },
            ]}
          >
            Team members
          </Text>

          {members.map((member, index) => (
            <View key={index} style={styles.memberRow}>
              <TextInput
                value={member}
                onChangeText={(value) => updateMember(index, value)}
                placeholder={`Member ${index + 1} name`}
                placeholderTextColor={theme.colors.textMuted}
                style={[
                  styles.memberInput,
                  {
                    backgroundColor: theme.colors.surface,

                    borderColor: theme.colors.border,

                    color: theme.colors.text,
                  },
                ]}
              />

              {members.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeMember(index)}
                  style={[
                    styles.removeButton,
                    {
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.danger,
                    }}
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity
            onPress={addMember}
            style={[
              styles.secondaryButton,
              {
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={{
                color: theme.colors.primary,

                fontWeight: "600",
              }}
            >
              + Add member
            </Text>
          </TouchableOpacity>

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
            placeholder="Required 4-digit PIN"
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
            disabled={isSaving}
            style={[
              styles.primaryButton,
              {
                backgroundColor: theme.colors.primary,

                borderRadius: theme.radius.lg,

                opacity: isSaving ? 0.6 : 1,
              },
            ]}
            onPress={handleCreateTeam}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  color: theme.colors.textOnPrimary,
                },
              ]}
            >
              {isSaving ? "Creating..." : "Create Team"}
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

  topRow: {
    flexDirection: "row",
    gap: 12,
  },

  teamNameContainer: {
    flex: 3,
    gap: 6,
  },

  gradeContainer: {
    flex: 1,
    gap: 6,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    paddingLeft: 3,
  },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },

  memberRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  memberInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },

  removeButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },

  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
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