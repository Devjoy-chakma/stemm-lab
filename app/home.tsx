import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';

const ACTIVITIES = [
  { id: 'parachute', name: 'Parachute Drop' },
  { id: 'sound', name: 'Sound Pollution Hunter' },
  { id: 'hand-fan', name: 'Hand Fan Challenge' },
  { id: 'earthquake', name: 'Earthquake Structure' },
  { id: 'human-perf', name: 'Human Performance' },
  { id: 'reaction', name: 'Reaction Board' },
  { id: 'breathing', name: 'Breathing Pace' },
];

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.content, { padding: theme.spacing.lg }]}
    >
      <Text style={[styles.title, { color: theme.colors.primary, fontSize: theme.fontSize.xxl }]}>Activities</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginBottom: theme.spacing.lg }]}>
        SCRUM-12 will build this properly
      </Text>

      {ACTIVITIES.map((a) => (
        <TouchableOpacity
          key={a.id}
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.sm,
              borderColor: theme.colors.borderStrong,
            },
          ]}
          onPress={() => router.push(`/activity/${a.id}`)}
        >
          <Text style={[styles.tileText, { color: theme.colors.primary, fontSize: theme.fontSize.md }]}>{a.name}</Text>
        </TouchableOpacity>
      ))}

      <View style={[styles.row, { gap: theme.spacing.sm, marginTop: theme.spacing.md }]}>
        <TouchableOpacity
          style={[
            styles.smallButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.md,
              paddingVertical: theme.spacing.sm + 4,
            },
          ]}
          onPress={() => router.push('/leaderboard')}
        >
          <Text style={[styles.smallButtonText, { color: theme.colors.textOnPrimary }]}>Leaderboard</Text>
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
          onPress={() => router.push('/settings')}
        >
          <Text style={[styles.smallButtonText, { color: theme.colors.textOnPrimary }]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 60 },
  title: { fontWeight: '700', marginBottom: 4 },
  subtitle: {},
  tile: { borderWidth: 1 },
  tileText: { fontWeight: '600' },
  row: { flexDirection: 'row' },
  smallButton: { flex: 1, alignItems: 'center' },
  smallButtonText: { fontWeight: '600' },
});