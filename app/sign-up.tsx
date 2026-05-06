import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';

export default function SignUp() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, padding: theme.spacing.lg }]}>
      <Text style={[styles.title, { color: theme.colors.primary, fontSize: theme.fontSize.display }]}>
        Sign Up
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted, fontSize: theme.fontSize.sm }]}>
        SCRUM-17 will build this
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.lg,
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.md,
            marginBottom: theme.spacing.md,
          },
        ]}
        onPress={() => router.push('/team-setup')}
      >
        <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>Create account →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={() => router.back()}>
        <Text style={[styles.linkText, { color: theme.colors.primarySoft }]}>← Back to sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', marginBottom: 8 },
  subtitle: { marginBottom: 40 },
  button: {},
  buttonText: { fontSize: 16, fontWeight: '600' },
  linkButton: { padding: 8 },
  linkText: { fontSize: 14 },
});