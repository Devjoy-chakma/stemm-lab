import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function Settings() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>SCRUM-29 will build this</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF5E5', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: '700', color: '#1D3557', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 40 },
  button: { backgroundColor: '#1D3557', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: '#FBF5E5', fontSize: 16, fontWeight: '600' },
});