import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function Activity() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.activityId}>{id}</Text>
      <Text style={styles.subtitle}>SCRUM-14 (shell) + SCRUM-21..27 (per activity)</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF5E5', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  activityId: { fontSize: 36, fontWeight: '700', color: '#1D3557', marginBottom: 8, textTransform: 'capitalize' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 40, textAlign: 'center' },
  button: { backgroundColor: '#1D3557', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: '#FBF5E5', fontSize: 16, fontWeight: '600' },
});