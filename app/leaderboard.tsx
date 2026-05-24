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

const ACTIVITY_LABELS: Record<string, string> = {
  reaction: "⚡ Reaction Board",
  "human-perf": "⚖️ Human Performance",
  breathing: "🫁 Breathing Pace",
};

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

  const getRankBadge = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";

    return `#${index + 1}`;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      {/* HERO */}
      {/* HERO */}
      <View
        style={[
          styles.hero,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => router.back()}
          >
            <Text
              style={[
                styles.backButtonText,
                {
                  color: theme.colors.primary,
                },
              ]}
            >
              ←
            </Text>
          </TouchableOpacity>
        </View>

        {/* TITLE */}
        <Text
          style={[
            styles.heroTitle,
            {
              color: theme.colors.primary,
            },
          ]}
        >
          Leaderboard
        </Text>

        <Text
          style={[
            styles.heroSubtitle,
            {
              color: theme.colors.textMuted,
            },
          ]}
        >
          Top STEMMLab team performances
        </Text>
      </View>

      {/* EMPTY */}
      {rows.length === 0 ? (
        <View style={styles.emptyState}>
          <Text
            style={[
              styles.emptyEmoji,
              {
                color: theme.colors.textMuted,
              },
            ]}
          >
            📊
          </Text>

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
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isTopThree = index < 3;

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      index === 0 ? theme.colors.accent : theme.colors.surface,

                    borderRadius: theme.radius.xl,

                    shadowColor: "#000",
                    shadowOffset: {
                      width: 0,
                      height: 6,
                    },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 4,
                  },
                ]}
              >
                {/* TOP ROW */}
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.rankBadge,
                      {
                        backgroundColor: isTopThree
                          ? theme.colors.primary
                          : theme.colors.surfaceMuted,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rankText,
                        {
                          color: isTopThree
                            ? theme.colors.textOnPrimary
                            : theme.colors.primary,
                        },
                      ]}
                    >
                      {getRankBadge(index)}
                    </Text>
                  </View>

                  <View style={styles.scoreSection}>
                    <Text
                      style={[
                        styles.score,
                        {
                          color:
                            index === 0
                              ? theme.colors.primary
                              : theme.colors.success,
                        },
                      ]}
                    >
                      {Math.round(item.score ?? 0)}
                    </Text>

                    <Text
                      style={[
                        styles.scoreLabel,
                        {
                          color:
                            index === 0
                              ? theme.colors.primarySoft
                              : theme.colors.textMuted,
                        },
                      ]}
                    >
                      SCORE
                    </Text>
                  </View>
                </View>

                {/* TEAM */}
                <Text
                  style={[
                    styles.teamName,
                    {
                      color:
                        index === 0 ? theme.colors.primary : theme.colors.text,
                    },
                  ]}
                >
                  {item.team_name}
                </Text>

                {/* ACTIVITY */}
                <View
                  style={[
                    styles.activityPill,
                    {
                      backgroundColor:
                        index === 0
                          ? theme.colors.surface
                          : theme.colors.surfaceMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.activityText,
                      {
                        color: theme.colors.primary,
                      },
                    ]}
                  >
                    {ACTIVITY_LABELS[item.activity_id] ?? item.activity_id}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  hero: {
    paddingTop: 64,
    paddingBottom: 24,
    paddingHorizontal: 20,

    borderBottomWidth: 1,
  },

  heroTitle: {
    fontSize: 32,
    fontWeight: "700",
    marginTop: 18,
  },

  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,

    borderRadius: 999,
    borderWidth: 1,

    justifyContent: "center",
    alignItems: "center",
  },

  backButtonText: {
    fontSize: 20,
    fontWeight: "700",
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },

  list: {
    padding: 20,
    paddingBottom: 120,
  },

  card: {
    padding: 20,
    marginBottom: 18,
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rankBadge: {
    minWidth: 64,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,

    justifyContent: "center",
    alignItems: "center",
  },

  rankText: {
    fontSize: 18,
    fontWeight: "700",
  },

  scoreSection: {
    alignItems: "flex-end",
  },

  score: {
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 44,
  },

  scoreLabel: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 1.5,
    fontWeight: "600",
  },

  teamName: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 18,
  },

  activityPill: {
    alignSelf: "flex-start",

    marginTop: 12,

    paddingVertical: 8,
    paddingHorizontal: 14,

    borderRadius: 999,
  },

  activityText: {
    fontSize: 14,
    fontWeight: "600",
  },

  floatingButton: {
    position: "absolute",

    bottom: 28,
    right: 24,

    paddingHorizontal: 22,
    paddingVertical: 16,

    borderRadius: 999,
  },

  floatingButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
