import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import BreathingPace from "../../src/activities/BreathingPace";
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
    case "breathing":
      return <BreathingPace />;
  }
}

const s = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 14, textAlign: 'center' },
});