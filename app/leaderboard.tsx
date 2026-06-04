import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { ComponentProps, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getLeaderboard } from "../src/database/repositories/attemptRepository";
import { db } from "../src/lib/firebase";
import { haptic } from "../src/lib/haptics";
import {
  computeTeamTotals,
  rankActivity,
  RawLeaderboardEntry,
} from "../src/lib/leaderboardAggregation";
import { LEADERBOARD_COLLECTION } from "../src/lib/leaderboardSync";
import { useTheme } from "../src/theme";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const ACTIVITY_META: Record<
  string,
  {
    icon: MciName;
    label: string;
  }
> = {
  parachute: { icon: "parachute", label: "Parachute Drop" },
  sound: { icon: "volume-high", label: "Sound Pollution" },
  "hand-fan": { icon: "weather-windy", label: "Hand Fan" },
  "human-perf": { icon: "run", label: "Human Performance" },
  reaction: { icon: "lightning-bolt", label: "Reaction Board" },
  breathing: { icon: "lungs", label: "Breathing Pace" },
};

// Medal cards (ranks 1-3) have metallic backgrounds that stay the
// same in both light and dark mode — so their text colours must be
// fixed too, or dark-mode text inverts to cream and disappears
// against the gold/silver/bronze.
const MEDAL_TEXT_DARK = "#1D3557";   // primary navy — strong contrast on metals
const MEDAL_TEXT_SUBTLE = "#1D2939"; // near-black for team name on gold (top spot)

type TabKey =
  | "overall"
  | "parachute"
  | "sound"
  | "hand-fan"
  | "human-perf"
  | "reaction"
  | "breathing";

const TABS: { key: TabKey; label: string; icon: MciName }[] = [
  { key: "overall", label: "Overall", icon: "trophy" },
  { key: "parachute", label: "Parachute", icon: "parachute" },
  { key: "sound", label: "Sound", icon: "volume-high" },
  { key: "hand-fan", label: "Hand Fan", icon: "weather-windy" },
  { key: "human-perf", label: "Human Perf", icon: "run" },
  { key: "reaction", label: "Reaction", icon: "lightning-bolt" },
  { key: "breathing", label: "Breathing", icon: "lungs" },
];

export default function Leaderboard() {
  const router = useRouter();
  const { theme } = useTheme();

  const [rows, setRows] = useState<RawLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingOfflineFallback, setUsingOfflineFallback] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overall");

  // Two derived views: Overall (sum-of-bests per team) or a single
  // activity's per-team ranking. Recomputed only when rows or tab change.
  const displayed = useMemo(() => {
    if (activeTab === "overall") return computeTeamTotals(rows);
    return rankActivity(rows, activeTab);
  }, [rows, activeTab]);
  const isOverall = activeTab === "overall";

  // Subscribe to Firestore (real-time). If the read fails (offline, no
  // permissions, etc.), fall back to the locally-persisted SQLite
  // leaderboard so the screen still shows something useful.
  useEffect(() => {
    let active = true;

    const q = query(
      collection(db, LEADERBOARD_COLLECTION),
      orderBy("score", "desc"),
      fbLimit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!active) return;
        const data: RawLeaderboardEntry[] = snap.docs.map((d) => {
          const x = d.data() as any;
          return {
            discriminator: x.discriminator,
            team_name: x.team_name,
            activity_id: x.activity_id,
            score: Number(x.score) || 0,
          };
        });
        setRows(data);
        setUsingOfflineFallback(false);
        setLoading(false);
      },
      async (err) => {
        console.warn("Firestore leaderboard read failed:", err);
        if (!active) return;
        try {
          const localRows = (await getLeaderboard()) as any[];
          if (!active) return;
          // SQLite getLeaderboard returns one row per attempt and has no
          // discriminator column — use team_name as the team key. Multiple
          // attempts collapse to the best one inside the aggregation lib.
          const mapped: RawLeaderboardEntry[] = localRows.map((r) => ({
            discriminator: String(r.team_name),
            team_name: String(r.team_name),
            activity_id: String(r.activity_id),
            score: Number(r.score) || 0,
          }));
          setRows(mapped);
          setUsingOfflineFallback(true);
        } catch (e) {
          console.warn("SQLite leaderboard fallback also failed:", e);
        } finally {
          if (active) setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, []);

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

          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => router.push("/map")}
            accessibilityLabel="Open map view"
          >
            <MaterialCommunityIcons
              name="map-outline"
              size={24}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* TABS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          const contentColor = active
            ? theme.colors.textOnPrimary
            : theme.colors.text;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                if (!active) haptic.selection();
                setActiveTab(tab.key);
              }}
              style={[
                styles.tab,
                {
                  backgroundColor: active
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              <View style={styles.tabInner}>
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={16}
                  color={contentColor}
                />
                <Text style={[styles.tabText, { color: contentColor }]}>
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {usingOfflineFallback ? (
        <View
          style={[
            styles.offlineBanner,
            { backgroundColor: theme.colors.surfaceMuted },
          ]}
        >
          <Text
            style={[styles.offlineBannerText, { color: theme.colors.textMuted }]}
          >
            Offline — showing saved scores
          </Text>
        </View>
      ) : null}

      {/* LOADING / EMPTY / LIST */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : displayed.length === 0 ? (
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
            {isOverall
              ? "No completed attempts yet."
              : `No team has completed ${
                  ACTIVITY_META[activeTab]?.label ?? activeTab
                } yet.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed as any[]}
          keyExtractor={(item) => String(item.discriminator)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isTopThree = index < 3;
            // Both row shapes carry rank, discriminator, team_name.
            // Overall has `total` + `activities_completed`; activity
            // rankings have `score`.
            const row = item as any;
            const displayScore: number = row.total ?? row.score ?? 0;
            const subInfo: string | null = isOverall
              ? `${row.activities_completed ?? 0}/6 activities`
              : null;

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
                            ? MEDAL_TEXT_DARK
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
                          color: isTopThree
                            ? MEDAL_TEXT_DARK
                            : theme.colors.primary,
                        },
                      ]}
                    >
                      {Math.round(displayScore)}
                    </Text>

                    <Text
                      style={[
                        styles.scoreLabel,
                        {
                          color: isTopThree
                            ? MEDAL_TEXT_DARK
                            : theme.colors.primarySoft,
                        },
                      ]}
                    >
                      {isOverall ? "TOTAL" : "SCORE"}
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
                          color: isTopThree
                            ? MEDAL_TEXT_SUBTLE
                            : theme.colors.text,
                        },
                      ]}
                    >
                      {item.team_name}
                    </Text>
                  </View>

                  {subInfo ? (
                    <View style={styles.activitySection}>
                      <Text
                        style={[
                          styles.activityText,
                          {
                            color: isTopThree
                              ? MEDAL_TEXT_DARK
                              : theme.colors.primary,
                          },
                        ]}
                      >
                        {subInfo}
                      </Text>
                    </View>
                  ) : null}
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

  tabScroll: {
    flexGrow: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  tabContent: {
    gap: 8,
    alignItems: "center",
  },

  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },

  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },

  offlineBanner: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: "center",
  },

  offlineBannerText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
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
