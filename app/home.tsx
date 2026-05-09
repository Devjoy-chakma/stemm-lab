import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../src/theme';

const ACTIVITIES = [
  { id: "parachute", name: "Parachute Drop", icon: "🪂" },
  { id: "sound", name: "Sound Pollution", icon: "🔊" },
  { id: "hand-fan", name: "Hand Fan", icon: "🪭" },
  { id: "human-perf", name: "Human Performance", icon: "🏃" },
  { id: "reaction", name: "Reaction Board", icon: "⚡" },
  { id: "breathing", name: "Breathing Pace", icon: "🫁" },
];

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          padding: theme.spacing.lg,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.primary,
              fontSize: theme.fontSize.xxl,
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
              fontSize: theme.fontSize.sm,
            },
          ]}
        >
          Explore fun STEMM activities{"\n"}
          with your team.
        </Text>
      </View>

      {/* Activity Grid */}
      <View style={styles.grid}>
        {ACTIVITIES.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[
              styles.tile,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                borderColor: theme.colors.borderStrong,
              },
            ]}
            onPress={() => router.push(`/activity/${a.id}`)}
          >
            <Text style={styles.icon}>{a.icon}</Text>

            <Text
              style={[
                styles.tileText,
                {
                  color: theme.colors.primary,
                  fontSize: theme.fontSize.sm,
                },
              ]}
            >
              {a.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom Buttons */}
      <View
        style={[
          styles.row,
          {
            gap: theme.spacing.sm,
            marginTop: theme.spacing.xl,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.smallButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.md,
              paddingVertical: theme.spacing.sm + 4,
            },
          ]}
          onPress={() => router.push("/leaderboard")}
        >
          <Text
            style={[
              styles.smallButtonText,
              {
                color: theme.colors.textOnPrimary,
              },
            ]}
          >
            Leaderboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.smallButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.md,
              paddingVertical: theme.spacing.sm + 4,
            },
          ]}
          onPress={() => router.push("/settings")}
        >
          <Text
            style={[
              styles.smallButtonText,
              {
                color: theme.colors.textOnPrimary,
              },
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingTop: 90,
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    marginBottom: 36,
  },

  title: {
    fontWeight: "700",
    marginBottom: 8,
  },

  subtitle: {
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },

  tile: {
    width: "48%",
    borderWidth: 1,
    minHeight: 140,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  icon: {
    fontSize: 36,
    marginBottom: 12,
  },

  tileText: {
    fontWeight: "600",
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
  },

  smallButton: {
    flex: 1,
    alignItems: "center",
  },

  smallButtonText: {
    fontWeight: "600",
  },
});