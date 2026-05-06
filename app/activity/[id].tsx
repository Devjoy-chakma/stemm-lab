import { Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ActivityShell from '../../src/components/ActivityShell';
import { useTheme } from '../../src/theme';

export default function ActivityRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();

  // For now, hardcoded test content for Parachute Drop.
  // Tickets SCRUM-23..29 will replace this with a per-activity registry.

  const briefSpeechText =
    'Build a parachute and drop it from a measured height. ' +
    'Time how long it takes to reach the floor. Try different parachute designs.';

  return (
    <ActivityShell
      activity_id={id ?? 'unknown'}
      title="Parachute Drop"
      briefSpeechText={briefSpeechText}
      brief={
        <View>
          <Text style={[styles.heading, { color: theme.colors.primary, fontSize: theme.fontSize.xl }]}>
            What you'll do
          </Text>
          <Text style={[styles.body, { color: theme.colors.text, fontSize: theme.fontSize.md, marginTop: theme.spacing.sm }]}>
            {briefSpeechText}
          </Text>

          <Text style={[styles.heading, { color: theme.colors.primary, fontSize: theme.fontSize.xl, marginTop: theme.spacing.lg }]}>
            What you need
          </Text>
          <Text style={[styles.body, { color: theme.colors.text, fontSize: theme.fontSize.md, marginTop: theme.spacing.sm }]}>
            • Plastic bag or cloth{'\n'}
            • String{'\n'}
            • A small weight (toy figure){'\n'}
            • Tape{'\n'}
            • A timer (the app will help)
          </Text>
        </View>
      }
      run={
        <View>
          <Text style={[styles.heading, { color: theme.colors.primary, fontSize: theme.fontSize.xl }]}>
            Run tab
          </Text>
          <Text style={[styles.body, { color: theme.colors.textMuted, fontSize: theme.fontSize.md, marginTop: theme.spacing.sm }]}>
            SCRUM-23 will build the drop timer here.
          </Text>
        </View>
      }
      results={
        <View>
          <Text style={[styles.heading, { color: theme.colors.primary, fontSize: theme.fontSize.xl }]}>
            Results tab
          </Text>
          <Text style={[styles.body, { color: theme.colors.textMuted, fontSize: theme.fontSize.md, marginTop: theme.spacing.sm }]}>
            SCRUM-23 will compute velocity, acceleration, drag here.
          </Text>
        </View>
      }
      writeUp={
        <View>
          <Text style={[styles.heading, { color: theme.colors.primary, fontSize: theme.fontSize.xl }]}>
            Reflection
          </Text>
          <Text style={[styles.body, { color: theme.colors.textMuted, fontSize: theme.fontSize.md, marginTop: theme.spacing.sm }]}>
            SCRUM-23 will add a text input here for the user's write-up.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: '700' },
  body: {},
});