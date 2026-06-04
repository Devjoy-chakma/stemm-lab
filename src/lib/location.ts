

import * as Location from 'expo-location';

export interface LatLng {
  lat: number;
  lng: number;
}

export async function getCurrentLocationOrNull(): Promise<LatLng | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch (e) {
    console.warn('Failed to read current location:', e);
    return null;
  }
}
