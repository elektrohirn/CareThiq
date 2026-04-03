import { useRouter } from 'expo-router';
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCasualStorage } from '../hooks/useCasualStorage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40;

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export default function CasualStatsScreen() {
  const router = useRouter();
  const { data, exportData, importData } = useCasualStorage();

  const recentIntakes = [...data.intakes]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
    .reverse();

  const chartLabels = recentIntakes.map(e => formatTime(e.timestamp));
  const wellbeingValues = recentIntakes.map(e => e.wellbeing);
  const hasData = recentIntakes.length >= 2;

  async function handleExport() {
    const ok = await exportData();
    if (!ok) Alert.alert('Export fehlgeschlagen', 'Bitte versuche es erneut.');
  }

  async function handleImport() {
    Alert.alert(
      'Daten importieren',
      'Bestehende Daten werden überschrieben. Fortfahren?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Importieren', onPress: async () => {
          const ok = await importData();
          if (!ok) Alert.alert('Import fehlgeschlagen', 'Bitte prüfe die Datei.');
          else Alert.alert('Erfolgreich', 'Daten wurden importiert.');
        }},
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Meine Auswertung</Text>
            <Text style={styles.subtitle}>Letzte 20 Einnahmen</Text>
          </View>
        </View>

        {/* Einnahmen als Taktgeber */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Einnahmen</Text>
          {recentIntakes.length === 0 ? (
            <Text style={styles.empty}>Noch keine Einnahmen erfasst.</Text>
          ) : (
            recentIntakes.slice().reverse().map((intake, i) => (
              <View key={i} style={styles.intakeRow}>
                <View style={styles.intakeDot} />
                <Text style={styles.intakeDate}>{formatDate(intake.timestamp)}</Text>
                <Text style={styles.intakeTime}>{formatTime(intake.timestamp)}</Text>
                <Text style={styles.intakeName}>{intake.medicationName}</Text>
                <Text style={styles.intakeDose}>{intake.dose}</Text>
              </View>
            ))
          )}
        </View>

        {/* Wohlbefinden-Verlauf */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wohlbefinden</Text>
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: '#4db89e' }]} />
            <Text style={styles.legendText}>1 = Super · 6 = Hilfe</Text>
          </View>
          {!hasData ? (
            <Text style={styles.empty}>Mindestens 2 Einnahmen nötig für den Verlauf.</Text>
          ) : (
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [{ data: wellbeingValues, color: () => '#4db89e', strokeWidth: 2 }],
              }}
              width={CHART_WIDTH}
              height={180}
              yAxisInterval={1}
              fromZero
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          )}
        </View>

        {/* Medikamenten-Übersicht */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meine Routinen</Text>
          {data.medications.length === 0 ? (
            <Text style={styles.empty}>Noch keine Routinen angelegt.</Text>
          ) : (
            data.medications.map((med, i) => (
              <View key={i} style={styles.medRow}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDose}>{med.dose} · {med.time} Uhr</Text>
              </View>
            ))
          )}
        </View>

        {/* Export / Import — dezent */}
        <View style={styles.dataActions}>
          <TouchableOpacity onPress={handleExport} activeOpacity={0.7}>
            <Text style={styles.dataActionText}>Daten exportieren</Text>
          </TouchableOpacity>
          <Text style={styles.dataActionSep}>·</Text>
          <TouchableOpacity onPress={handleImport} activeOpacity={0.7}>
            <Text style={styles.dataActionText}>Daten importieren</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.watermark}>CareThiq</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const chartConfig = {
  backgroundColor: '#1e2d3d',
  backgroundGradientFrom: '#1e2d3d',
  backgroundGradientTo: '#1e2d3d',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(77, 184, 158, ${opacity})`,
  labelColor: () => '#718096',
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#4db89e' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f5' },
  scroll: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#d8ede8', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#4db89e', fontSize: 28, fontWeight: '300', lineHeight: 36 },
  title: { fontSize: 22, fontWeight: '800', color: '#2d3748' },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 2 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#2d3748', marginBottom: 12 },
  empty: { fontSize: 14, color: '#a0aec0', textAlign: 'center', paddingVertical: 16 },
  chart: { borderRadius: 12, marginTop: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, color: '#718096' },
  intakeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f7fafc' },
  intakeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4db89e' },
  intakeDate: { fontSize: 12, color: '#a0aec0', width: 40 },
  intakeTime: { fontSize: 13, fontWeight: '700', color: '#4db89e', width: 40 },
  intakeName: { fontSize: 13, fontWeight: '700', color: '#2d3748', flex: 1 },
  intakeDose: { fontSize: 12, color: '#718096' },
  medRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f7fafc' },
  medName: { fontSize: 15, fontWeight: '700', color: '#2d3748' },
  medDose: { fontSize: 13, color: '#718096', marginTop: 2 },
  dataActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 8 },
  dataActionText: { fontSize: 13, color: '#a0aec0', textDecorationLine: 'underline' },
  dataActionSep: { fontSize: 13, color: '#cbd5e0' },
  watermark: { textAlign: 'center', fontSize: 40, fontWeight: '800', color: 'rgba(77, 184, 158, 0.08)', marginTop: 32, letterSpacing: -2 },
});