import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40;

const BEHAVIOR_TAGS = [
  { label: 'Gut gelaunt',   color: '#1a9e5c' },
  { label: 'Kooperativ',    color: '#4db89e' },
  { label: 'Unruhig',       color: '#e8c020' },
  { label: 'Vergesslich',   color: '#e8a020' },
  { label: 'Zurückgezogen', color: '#718096' },
  { label: 'Verwirrt',      color: '#e87820' },
  { label: 'Schmerzen',     color: '#cc1111' },
  { label: 'Aggressiv',     color: '#9b1111' },
  { label: 'Lethargisch',   color: '#5b6b7c' },
];

const WELLBEING_LABELS = ['', 'Super', 'Gut', 'Ok', 'Nicht so', 'Schlecht', 'Hilfe'];
const WELLBEING_COLORS = ['', '#1a9e5c', '#7cc87a', '#d4d44a', '#e8c020', '#e87820', '#cc1111'];

const TYPE_COLOR_STANDALONE = '#4db89e';
const TYPE_COLOR_INTAKE     = '#e91497';

interface ApiVital {
  id: number;
  blutdruck?: string;
  puls?: number;
  gewicht?: number;
  recorded_at: string;
}

interface ApiBehavior {
  id: number;
  tags: string[];
  recorded_at: string;
}

interface ApiIntake {
  id: number;
  medication_name: string;
  dose: string;
  wellbeing: number | null;
  taken_at: string;
}

interface ApiWellbeing {
  id: number;
  value: number;
  recorded_at: string;
}

interface WellbeingPoint {
  value: number;
  time: string;
  type: 'standalone' | 'intake';
  label?: string;
}

type VitalType = 'puls' | 'gewicht';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export default function StatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patientId: string; patientName: string }>();
  const patientId = Number(params.patientId);
  const patientName = params.patientName ?? 'Patient';

  const [vitals, setVitals] = useState<ApiVital[]>([]);
  const [behaviors, setBehaviors] = useState<ApiBehavior[]>([]);
  const [intakes, setIntakes] = useState<ApiIntake[]>([]);
  const [wellbeingLogs, setWellbeingLogs] = useState<ApiWellbeing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVital, setActiveVital] = useState<VitalType>('puls');
  const [activePage, setActivePage] = useState<'overview' | 'wellbeing' | 'behavior'>('overview');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [v, b, i, w] = await Promise.all([
          api.getVitals(patientId),
          api.getBehavior(patientId),
          api.getPatientIntake(patientId),
          api.getPatientWellbeing(patientId),
        ]);
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
        setVitals((v as ApiVital[]).filter(e => new Date(e.recorded_at) >= cutoff));
        setBehaviors((b as ApiBehavior[]).filter(e => new Date(e.recorded_at) >= cutoff));
        setIntakes((i as ApiIntake[]).filter(e => new Date(e.taken_at) >= cutoff));
        setWellbeingLogs((w as ApiWellbeing[]).filter(e => new Date(e.recorded_at) >= cutoff));

        // DEBUG — nach dem Test entfernen
        console.log('DEBUG intakes:', JSON.stringify(i));
        console.log('DEBUG wellbeingLogs:', JSON.stringify(w));
      } catch (err) {
        console.log('DEBUG load error:', err);
      }
      finally { setLoading(false); }
    }
    load();
  }, [patientId]);

  // Vitalwerte
  const vitalLabels      = vitals.map(v => formatTime(v.recorded_at));
  const pulsData         = vitals.map(v => v.puls ?? 0);
  const gewichtData      = vitals.map(v => v.gewicht ?? 0);
  const activeVitalData  = activeVital === 'puls' ? pulsData : gewichtData;
  const hasVitals        = vitals.length >= 2 && activeVitalData.some(v => v > 0);

  // Kombinierter Wohlbefinden-Chart
  const combinedPoints: WellbeingPoint[] = [
    ...wellbeingLogs.map(w => ({
      value: w.value,
      time: w.recorded_at,
      type: 'standalone' as const,
    })),
    ...intakes
      .filter(i => i.wellbeing !== null && i.wellbeing > 0)
      .map(i => ({
        value: i.wellbeing as number,
        time: i.taken_at,
        type: 'intake' as const,
        label: i.medication_name,
      })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const hasWellbeing         = combinedPoints.length >= 2;
  const wellbeingChartLabels = combinedPoints.map(p => formatTime(p.time));
  const wellbeingChartData   = combinedPoints.map(p => p.value);

  const dotColors = combinedPoints.map(p =>
    p.type === 'standalone' ? TYPE_COLOR_STANDALONE : TYPE_COLOR_INTAKE
  );

  // Verhalten
  function getBehaviorCounts() {
    const counts: Record<string, number> = {};
    behaviors.forEach(b => {
      b.tags.forEach(tag => { counts[tag] = (counts[tag] ?? 0) + 1; });
    });
    return BEHAVIOR_TAGS
      .filter(t => counts[t.label])
      .map(t => ({ label: t.label, count: counts[t.label], color: t.color }));
  }
  const behaviorCounts = getBehaviorCounts();
  const hasBehaviors   = behaviorCounts.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{patientName}</Text>
            <Text style={styles.subtitle}>Letzte 48 Stunden</Text>
          </View>
        </View>

        {/* Page-Auswahl */}
        <View style={styles.pageBar}>
          <TouchableOpacity style={[styles.pageBtn, activePage === 'overview' && styles.pageBtnActive]} onPress={() => setActivePage('overview')}>
            <Text style={[styles.pageBtnText, activePage === 'overview' && styles.pageBtnTextActive]}>Vitalwerte</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pageBtn, activePage === 'wellbeing' && styles.pageBtnActive]} onPress={() => setActivePage('wellbeing')}>
            <Text style={[styles.pageBtnText, activePage === 'wellbeing' && styles.pageBtnTextActive]}>Wohlbefinden</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pageBtn, activePage === 'behavior' && styles.pageBtnActive]} onPress={() => setActivePage('behavior')}>
            <Text style={[styles.pageBtnText, activePage === 'behavior' && styles.pageBtnTextActive]}>Verhalten</Text>
          </TouchableOpacity>
        </View>

        {loading && <Text style={styles.empty}>Daten werden geladen...</Text>}

        {/* ── Seite 1: Vitalwerte ── */}
        {!loading && activePage === 'overview' && (
          <>
            <View style={styles.vitalSelector}>
              {(['puls', 'gewicht'] as VitalType[]).map(v => (
                <TouchableOpacity key={v} style={[styles.vitalBtn, activeVital === v && styles.vitalBtnActive]} onPress={() => setActiveVital(v)}>
                  <Text style={[styles.vitalBtnText, activeVital === v && styles.vitalBtnTextActive]}>
                    {v === 'puls' ? 'Puls (bpm)' : 'Gewicht (kg)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{activeVital === 'puls' ? 'Puls' : 'Gewicht'}</Text>
              <View style={styles.legend}>
                <View style={[styles.legendDot, { backgroundColor: '#5b8dee' }]} />
                <Text style={styles.legendText}>{activeVital === 'puls' ? 'Puls in bpm' : 'Gewicht in kg'}</Text>
              </View>
              {!hasVitals ? (
                <Text style={styles.empty}>Noch keine Vitalwerte in den letzten 8 Stunden.</Text>
              ) : (
                <LineChart
                  data={{ labels: vitalLabels, datasets: [{ data: activeVitalData, color: () => '#5b8dee', strokeWidth: 2 }] }}
                  width={CHART_WIDTH} height={180} yAxisInterval={1} fromZero
                  chartConfig={chartConfigBlue} bezier style={styles.chart}
                />
              )}
            </View>
            {vitals.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Messwerte</Text>
                {vitals.slice().reverse().map((v, i) => (
                  <View key={i} style={styles.row}>
                    <View style={[styles.rowDot, { backgroundColor: '#5b8dee' }]} />
                    <Text style={styles.rowTime}>{formatTime(v.recorded_at)}</Text>
                    {v.puls      ? <Text style={styles.rowName}>Puls {v.puls} bpm</Text>  : null}
                    {v.gewicht   ? <Text style={styles.rowSub}>{v.gewicht} kg</Text>       : null}
                    {v.blutdruck ? <Text style={styles.rowSub}>{v.blutdruck} mmHg</Text>  : null}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Seite 2: Wohlbefinden ── */}
        {!loading && activePage === 'wellbeing' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Wohlbefinden-Verlauf</Text>
              <View style={styles.legendRow}>
                <View style={styles.legend}>
                  <View style={[styles.legendDot, { backgroundColor: TYPE_COLOR_STANDALONE }]} />
                  <Text style={styles.legendText}>Freistehend</Text>
                </View>
                <View style={styles.legend}>
                  <View style={[styles.legendDot, { backgroundColor: TYPE_COLOR_INTAKE }]} />
                  <Text style={styles.legendText}>Bei Einnahme</Text>
                </View>
              </View>
              <Text style={styles.cardSub}>1 = Super · 6 = Hilfe</Text>
              {!hasWellbeing ? (
                <Text style={styles.empty}>Noch keine Wohlbefindens-Einträge in den letzten 8 Stunden.</Text>
              ) : (
                <LineChart
                  data={{
                    labels: wellbeingChartLabels,
                    datasets: [{
                      data: wellbeingChartData,
                      color: (opacity = 1) => `rgba(77, 184, 158, ${opacity})`,
                      strokeWidth: 2,
                    }],
                  }}
                  width={CHART_WIDTH}
                  height={200}
                  yAxisInterval={1}
                  fromZero
                  chartConfig={chartConfig}
                  getDotColor={(_dataPoint: number, index: number) => dotColors[index] ?? TYPE_COLOR_STANDALONE}
                  bezier
                  style={styles.chart}
                />
              )}
            </View>

            {combinedPoints.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Alle Einträge</Text>
                {combinedPoints.slice().reverse().map((point, i) => (
                  <View key={i} style={styles.row}>
                    <View style={[
                      styles.rowDot,
                      { backgroundColor: point.type === 'standalone' ? TYPE_COLOR_STANDALONE : TYPE_COLOR_INTAKE }
                    ]} />
                    <Text style={styles.rowDate}>{formatDate(point.time)}</Text>
                    <Text style={styles.rowTime}>{formatTime(point.time)}</Text>
                    <View style={styles.rowMeta}>
                      <Text style={[styles.rowName, { color: WELLBEING_COLORS[point.value] }]}>
                        {WELLBEING_LABELS[point.value]}
                      </Text>
                      {point.type === 'intake' && point.label ? (
                        <Text style={styles.rowSub}>bei {point.label}</Text>
                      ) : (
                        <Text style={styles.rowSub}>freistehend</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Seite 3: Verhalten ── */}
        {!loading && activePage === 'behavior' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verhaltens-Häufigkeit</Text>
            <Text style={styles.cardSub}>Anzahl der Beobachtungen</Text>
            {!hasBehaviors ? (
              <Text style={styles.empty}>Noch keine Verhaltens-Tags in den letzten 8 Stunden.</Text>
            ) : (
              <>
                <BarChart
                  data={{
                    labels: behaviorCounts.map(b => b.label.slice(0, 6)),
                    datasets: [{ data: behaviorCounts.map(b => b.count) }],
                  }}
                  width={CHART_WIDTH} height={220}
                  yAxisLabel="" yAxisSuffix="x"
                  chartConfig={chartConfigBar} style={styles.chart}
                  showValuesOnTopOfBars
                />
                <View style={styles.behaviorLegend}>
                  {behaviorCounts.map(b => (
                    <View key={b.label} style={styles.legend}>
                      <View style={[styles.legendDot, { backgroundColor: b.color }]} />
                      <Text style={styles.legendText}>{b.label} ({b.count}x)</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

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

const chartConfigBlue = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(91, 141, 238, ${opacity})`,
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#5b8dee' },
};

const chartConfigBar = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(77, 184, 158, ${opacity})`,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },
  scroll: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e2d3d', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#4db89e', fontSize: 28, fontWeight: '300', lineHeight: 36 },
  title: { fontSize: 22, fontWeight: '800', color: '#e2e8f0' },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 2 },
  pageBar: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  pageBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#1e2d3d', alignItems: 'center' },
  pageBtnActive: { backgroundColor: '#4db89e' },
  pageBtnText: { fontSize: 11, fontWeight: '700', color: '#718096' },
  pageBtnTextActive: { color: 'white' },
  card: { backgroundColor: '#1e2d3d', borderRadius: 20, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#e2e8f0', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#718096', marginBottom: 12 },
  empty: { fontSize: 14, color: '#4a5568', textAlign: 'center', paddingVertical: 24 },
  chart: { borderRadius: 12, marginTop: 12 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, color: '#718096' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2d3f50' },
  rowDot: { width: 8, height: 8, borderRadius: 4 },
  rowDate: { fontSize: 12, color: '#a0aec0', width: 44 },
  rowTime: { fontSize: 13, fontWeight: '700', color: '#5b8dee', width: 40 },
  rowMeta: { flex: 1 },
  rowName: { fontSize: 13, fontWeight: '700', color: '#e2e8f0' },
  rowSub: { fontSize: 12, color: '#718096', marginTop: 1 },
  vitalSelector: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  vitalBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1e2d3d', alignItems: 'center' },
  vitalBtnActive: { backgroundColor: '#5b8dee' },
  vitalBtnText: { fontSize: 13, fontWeight: '700', color: '#718096' },
  vitalBtnTextActive: { color: 'white' },
  behaviorLegend: { marginTop: 16, gap: 8 },
  watermark: { textAlign: 'center', fontSize: 40, fontWeight: '800', color: 'rgba(77, 184, 158, 0.05)', marginTop: 40, letterSpacing: -2 },
});