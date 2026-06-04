import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { ComponentProps, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Callout, Marker, PROVIDER_DEFAULT } from "react-native-maps";

import { db } from "../src/lib/firebase";
import { getCurrentLocationOrNull, LatLng } from "../src/lib/location";
import { LEADERBOARD_COLLECTION } from "../src/lib/leaderboardSync";
import { useTheme } from "../src/theme";

type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const ACTIVITY_META: Record<
  string,
  { icon: MciName; label: string; color: string }
> = {
  parachute: { icon: "parachute", label: "Parachute Drop", color: "#2A9D8F" },
  sound: { icon: "volume-high", label: "Sound Pollution", color: "#E76F51" },
  "hand-fan": { icon: "weather-windy", label: "Hand Fan", color: "#457B9D" },
  "human-perf": { icon: "run", label: "Human Performance", color: "#C9A961" },
  reaction: { icon: "lightning-bolt", label: "Reaction Board", color: "#E63946" },
  breathing: { icon: "lungs", label: "Breathing Pace", color: "#1D3557" },
};

interface GeoEntry {
  id: string;
  team_name: string;
  activity_id: string;
  score: number;
  gps_lat: number;
  gps_lng: number;
}

export default function MapScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [entries, setEntries] = useState<GeoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);

  // Subscribe to Firestore — same collection the leaderboard reads,
  // filtered client-side to entries that actually have GPS coords.
  useEffect(() => {
    let active = true;

    const q = query(
      collection(db, LEADERBOARD_COLLECTION),
      orderBy("completed_at", "desc"),
      fbLimit(200)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!active) return;
        const rows: GeoEntry[] = [];
        for (const d of snap.docs) {
          const x = d.data() as any;
          if (
            typeof x.gps_lat === "number" &&
            typeof x.gps_lng === "number"
          ) {
            rows.push({
              id: d.id,
              team_name: String(x.team_name ?? ""),
              activity_id: String(x.activity_id ?? ""),
              score: Number(x.score) || 0,
              gps_lat: x.gps_lat,
              gps_lng: x.gps_lng,
            });
          }
        }
        setEntries(rows);
        setLoading(false);
      },
      (err) => {
        console.warn("Map Firestore read failed:", err);
        if (active) setLoading(false);
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Try to get the user's current location for the initial region.
  useEffect(() => {
    getCurrentLocationOrNull().then((loc) => {
      if (loc) setMyLocation(loc);
    });
  }, []);

  const initialRegion = useMemo(() => {
    if (myLocation) {
      return {
        latitude: myLocation.lat,
        longitude: myLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (entries.length > 0) {
      return {
        latitude: entries[0].gps_lat,
        longitude: entries[0].gps_lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    // Fallback: Melbourne, AU
    return {
      latitude: -37.8136,
      longitude: 144.9631,
      latitudeDelta: 5,
      longitudeDelta: 5,
    };
  }, [myLocation, entries]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* HEADER */}
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackButton}
        >
          <Text style={[styles.headerBackText, { color: theme.colors.primary }]}>
            ←
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>
            Map view
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}
          >
            {loading
              ? "Loading attempts…"
              : `${entries.length} attempt${entries.length === 1 ? "" : "s"} with GPS`}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="map-marker-off"
            size={56}
            color={theme.colors.textMuted}
          />
          <Text
            style={[styles.emptyText, { color: theme.colors.textMuted }]}
          >
            No attempts have GPS tags yet. Allow location access next time
            you start an activity.
          </Text>
        </View>
      ) : (
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
        >
          {entries.map((e) => {
            const meta = ACTIVITY_META[e.activity_id];
            return (
              <Marker
                key={e.id}
                coordinate={{ latitude: e.gps_lat, longitude: e.gps_lng }}
                pinColor={meta?.color}
              >
                <Callout>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{e.team_name}</Text>
                    <Text style={styles.calloutLine}>
                      {meta?.label ?? e.activity_id}
                    </Text>
                    <Text style={styles.calloutScore}>Score: {e.score}</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 58,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  headerBackButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBackText: { fontSize: 20, fontWeight: "700" },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
  headerSpacer: { width: 42 },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyText: { fontSize: 16, textAlign: "center" },
  map: { flex: 1 },
  callout: { minWidth: 160, padding: 4 },
  calloutTitle: { fontWeight: "700", fontSize: 15, marginBottom: 2 },
  calloutLine: { fontSize: 13, color: "#374151", marginBottom: 4 },
  calloutScore: { fontSize: 13, fontWeight: "600" },
});
