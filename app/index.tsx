import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/theme';

export default function Welcome() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />

      <Text style={[styles.title, { color: theme.colors.primary, fontSize: theme.fontSize.hero }]}>
        STEMMLab
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontSize: theme.fontSize.md }]}>
        Welcome screen (SCRUM-7 stub)
      </Text>

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
        onPress={() => router.push('/sign-in')}
      >
        <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>Continue →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    marginBottom: 48,
  },
  button: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});