import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

const CHECK_INTERVAL_MS = 15000; // alle 15 Sekunden
const PROXIMITY_RADIUS_M = 100;  // 100 Meter

export interface PatientLocation {
  patientId: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface ProximityResult {
  nearby: PatientLocation[];
  permissionGranted: boolean;
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useProximity(patients: PatientLocation[]): ProximityResult {
  const [nearby, setNearby] = useState<PatientLocation[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function requestPermission() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setPermissionGranted(true);
      }
    }
    requestPermission();
  }, []);

  useEffect(() => {
    if (!permissionGranted || patients.length === 0) return;

    async function check() {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;

        const close = patients.filter(p =>
          haversineDistance(latitude, longitude, p.latitude, p.longitude) <= PROXIMITY_RADIUS_M
        );
        setNearby(close);
      } catch {
        // Standort nicht verfügbar
      }
    }

    check();
    intervalRef.current = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [permissionGranted, patients]);

  return { nearby, permissionGranted };
}