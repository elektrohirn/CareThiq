import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'carethiq_casual_data';

export interface CasualMedication {
  id: number;
  name: string;
  dose: string;
  time: string;
  taken: boolean;
  missed: boolean;
  food_required: boolean;
  ingredient?: string;
}

export interface CasualIntake {
  id: string;
  medicationId: number;
  medicationName: string;
  dose: string;
  timestamp: string;
  wellbeing: number;
}

export interface CasualData {
  medications: CasualMedication[];
  intakes: CasualIntake[];
  exportedAt?: string;
}

const EMPTY_DATA: CasualData = {
  medications: [],
  intakes: [],
};

export function useCasualStorage() {
  const [data, setData] = useState<CasualData>(EMPTY_DATA);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setData(JSON.parse(raw));
      } catch {}
      finally { setLoaded(true); }
    }
    load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data, loaded]);

  function saveMedications(medications: CasualMedication[]) {
    setData(prev => ({ ...prev, medications }));
  }

  function addIntake(intake: Omit<CasualIntake, 'id'>) {
    const newIntake: CasualIntake = {
      ...intake,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setData(prev => ({ ...prev, intakes: [...prev.intakes, newIntake] }));
  }

  async function exportData(): Promise<boolean> {
    try {
      const exportPayload: CasualData = { ...data, exportedAt: new Date().toISOString() };
      const json = JSON.stringify(exportPayload, null, 2);
      const fileUri = FileSystem.cacheDirectory + 'carethiq_backup.json';
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'CareThiq Daten exportieren',
        UTI: 'public.json',
      });
      return true;
    } catch { return false; }
  }

  async function importData(): Promise<boolean> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return false;
      const fileUri = result.assets[0].uri;
      const raw = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed: CasualData = JSON.parse(raw);
      if (!parsed.medications || !parsed.intakes) return false;
      setData(parsed);
      return true;
    } catch { return false; }
  }

  return { data, loaded, saveMedications, addIntake, exportData, importData };
}