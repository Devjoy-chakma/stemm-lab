import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const ACTIVITIES = [
  { id: 'parachute', name: 'Parachute Drop' },
  { id: 'sound', name: 'Sound Pollution Hunter' },
  { id: 'fan', name: 'Hand Fan Challenge' },
  { id: 'earthquake', name: 'Earthquake Structure' },
  { id: 'human-perf', name: 'Human Performance' },
  { id: 'reaction', name: 'Reaction Board' },
  { id: 'breathing', name: 'Breathing Pace' },
];

export default function Home() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Activities</Text>
      <Text style={styles.subtitle}>SCRUM-12 will build this properly</Text>

      {ACTIVITIES.map((a) => (
        <TouchableOpacity
          key={a.id}
          style={styles.tile}
          onPress={() => router.push(`/activity/${a.id}`)}
        >
          <Text style={styles.tileText}>{a.name}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.row}>
        <TouchableOpacity style={styles.smallButton} onPress={() => router.push('/leaderboard')}>
          <Text style={styles.smallButtonText}>Leaderboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButton} onPress={() => router.push('/settings')}>
          <Text style={styles.smallButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF5E5' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: '700', color: '#1D3557', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 24 },
  tile: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#457B9D' },
  tileText: { fontSize: 16, fontWeight: '600', color: '#1D3557' },
  row: { flexDirection: 'row', gap: 10, marginTop: 20 },
  smallButton: { flex: 1, backgroundColor: '#1D3557', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  smallButtonText: { color: '#FBF5E5', fontWeight: '600' },
});