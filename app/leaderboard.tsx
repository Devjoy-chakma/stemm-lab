import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getLeaderboard } from "../src/database/repositories/attemptRepository";
import { useTheme } from "../src/theme";

export default function Leaderboard() {
  const router = useRouter();
  const { theme } = useTheme();

  const [rows, setRows] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadLeaderboard();
    }, [])
  );

  const loadLeaderboard = async () => {
    const data = await getLeaderboard();
    setRows(data);
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
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.primary,
            fontSize: theme.fontSize.display,
          },
        ]}
      >
        Leaderboard
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
        SCRUM-28 will build this
      </Text>

      {rows.length === 0 ? (
        <View style={styles.emptyState}>
          <Text
            style={[
              styles.emptyText,
              {
                color: theme.colors.textMuted,
              },
            ]}
          >
            No completed attempts yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.attempt_id)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radius.lg,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text
                  style={[
                    styles.rank,
                    {
                      color: theme.colors.primary,
                    },
                  ]}
                >
                  #{index + 1}
                </Text>

                <Text
                  style={[
                    styles.score,
                    {
                      color: theme.colors.success,
                    },
                  ]}
                >
                  {Math.round(item.score ?? 0)}
                </Text>
              </View>

              <Text
                style={[
                  styles.teamName,
                  {
                    color: theme.colors.text,
                  },
                ]}
              >
                {item.team_name}
              </Text>

              <Text
                style={[
                  styles.activity,
                  {
                    color: theme.colors.textMuted,
                  },
                ]}
              >
                {item.activity_id}
              </Text>
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.lg,
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.md,
          },
        ]}
        onPress={() => router.back()}
      >
        <Text
          style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}
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
  },

  title: {
    fontWeight: "700",
    marginTop: 60,
    marginBottom: 8,
  },

  subtitle: {
    marginBottom: 24,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 16,
  },

  list: {
    paddingBottom: 24,
  },

  card: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rank: {
    fontSize: 18,
    fontWeight: "700",
  },

  score: {
    fontSize: 28,
    fontWeight: "700",
  },

  teamName: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },

  activity: {
    fontSize: 14,
    marginTop: 4,
  },

  button: {
    alignItems: "center",
    marginBottom: 24,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
