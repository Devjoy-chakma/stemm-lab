import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import HandFan from '../../src/activities/HandFan';
import HumanPerformance from "../../src/activities/HumanPerformance";
import ParachuteDrop from '../../src/activities/ParachuteDrop';
import ReactionBoard from "../../src/activities/ReactionBoard";
import SoundPollution from '../../src/activities/SoundPollution';
import { useTheme } from '../../src/theme';

export default function ActivityRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();

  switch (id) {
    case "parachute":
      return <ParachuteDrop />;
    case "sound":
      return <SoundPollution />;
    case "hand-fan":
      return <HandFan />;
    case "human-perf":
      return <HumanPerformance />;
    case "reaction":
      return <ReactionBoard />;
    default:
      return (
        <View
          style={[s.fallback, { backgroundColor: theme.colors.background }]}
        >
          <Text style={[s.heading, { color: theme.colors.primary }]}>
            Activity coming soon
          </Text>
          <Text style={[s.body, { color: theme.colors.textMuted }]}>
            "{id}" isn't built yet. Check back in Sprint 2.
          </Text>
        </View>
      );
  }
}

const s = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 14, textAlign: 'center' },
});