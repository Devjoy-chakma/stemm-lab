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

const ACTIVITY_META: Record<
  string,
  {
    icon: string;
    label: string;
  }
> = {
  parachute: {
    icon: "🪂",
    label: "Parachute Drop",
  },

  sound: {
    icon: "🔊",
    label: "Sound Pollution",
  },

  "hand-fan": {
    icon: "🪭",
    label: "Hand Fan",
  },

  "human-perf": {
    icon: "🏃",
    label: "Human Performance",
  },

  reaction: {
    icon: "⚡",
    label: "Reaction Board",
  },

  breathing: {
    icon: "🫁",
    label: "Breathing Pace",
  },
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
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        {/* TOP ROW */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => router.back()}
          >
            <Text
              style={[
                styles.headerBackText,
                {
                  color: theme.colors.primary,
                },
              ]}
            >
              ←
            </Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text
              style={[
                styles.headerTitle,
                {
                  color: theme.colors.primary,
                },
              ]}
            >
              Leaderboard
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: theme.colors.textMuted,
                },
              ]}
            >
              Top STEMMLab performers
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>
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
                      index === 0
                        ? "#CBB06A"
                        : index === 1
                        ? "#AEB8C2"
                        : index === 2
                        ? "#B98D6F"
                        : theme.colors.surface,

                    borderRadius: theme.radius.xl,

                    borderWidth: 1,

                    borderColor:
                      index === 0
                        ? "#A88A2A"
                        : index === 1
                        ? "#7E8B99"
                        : index === 2
                        ? "#8A5A3B"
                        : theme.colors.borderStrong,

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
                        backgroundColor:
                          index === 0
                            ? "#DCC98A"
                            : index === 1
                            ? "#C5CED8"
                            : index === 2
                            ? "#CDAF98"
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
                          color: theme.colors.primary,
                        },
                      ]}
                    >
                      {Math.round(item.score ?? 0)}
                    </Text>

                    <Text
                      style={[
                        styles.scoreLabel,
                        {
                          color: theme.colors.primarySoft,
                        },
                      ]}
                    >
                      SCORE
                    </Text>
                  </View>
                </View>

                {/* BOTTOM ROW */}
                <View style={styles.bottomRow}>
                  <View style={styles.teamSection}>
                    <Text
                      style={[
                        styles.teamName,
                        {
                          color:
                            index === 0
                              ? theme.colors.primary
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {item.team_name}
                    </Text>
                  </View>

                  <View style={styles.activitySection}>
                    <Text
                      style={[
                        styles.activityText,
                        {
                          color: theme.colors.primary,
                        },
                      ]}
                    >
                      {ACTIVITY_META[item.activity_id]?.icon}{" "}
                      {ACTIVITY_META[item.activity_id]?.label ??
                        item.activity_id}
                    </Text>
                  </View>
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

  header: {
    paddingTop: 58,
    paddingBottom: 18,
    paddingHorizontal: 20,

    borderBottomWidth: 1,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    marginTop: 4,
  },

  headerBackButton: {
    width: 42,
    height: 42,

    justifyContent: "center",
    alignItems: "center",
  },

  headerBackText: {
    fontSize: 20,
    fontWeight: "700",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },

  headerSpacer: {
    width: 42,
  },

  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  headerCenter: {
    alignItems: "center",
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
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 44,
  },

  scoreLabel: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 1.5,
    fontWeight: "500",
  },

  teamName: {
    fontSize: 20,
    fontWeight: "700",
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",

    marginTop: 18,
  },

  teamSection: {
    flex: 1,
    paddingRight: 12,
  },

  activitySection: {
    justifyContent: "flex-end",
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
