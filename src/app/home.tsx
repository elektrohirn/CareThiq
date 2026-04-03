import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface SmileyProps {
  color: string;
  size?: number;
  mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible' | 'help';
}

function Smiley({ color, size = 56, mood }: SmileyProps) {
  const r = size / 2;
  const eyeY = r * 0.55;
  const eyeX = r * 0.32;
  const eyeR = r * 0.09;
  const mouthY = r * 0.88;
  const mouthR = r * 0.28;

  function getMouth() {
    if (mood === 'great')    return <Path d={`M ${r - mouthR} ${mouthY - mouthR * 0.3} Q ${r} ${mouthY + mouthR * 0.8} ${r + mouthR} ${mouthY - mouthR * 0.3}`} stroke={color} strokeWidth={r * 0.1} fill="none" strokeLinecap="round" />;
    if (mood === 'good')     return <Path d={`M ${r - mouthR * 0.8} ${mouthY - mouthR * 0.2} Q ${r} ${mouthY + mouthR * 0.5} ${r + mouthR * 0.8} ${mouthY - mouthR * 0.2}`} stroke={color} strokeWidth={r * 0.1} fill="none" strokeLinecap="round" />;
    if (mood === 'okay')     return <Line x1={r - mouthR * 0.7} y1={mouthY} x2={r + mouthR * 0.7} y2={mouthY} stroke={color} strokeWidth={r * 0.1} strokeLinecap="round" />;
    if (mood === 'bad')      return <Path d={`M ${r - mouthR * 0.8} ${mouthY + mouthR * 0.3} Q ${r} ${mouthY - mouthR * 0.5} ${r + mouthR * 0.8} ${mouthY + mouthR * 0.3}`} stroke={color} strokeWidth={r * 0.1} fill="none" strokeLinecap="round" />;
    if (mood === 'terrible') return <Path d={`M ${r - mouthR} ${mouthY + mouthR * 0.5} Q ${r} ${mouthY - mouthR * 0.7} ${r + mouthR} ${mouthY + mouthR * 0.5}`} stroke={color} strokeWidth={r * 0.1} fill="none" strokeLinecap="round" />;
    if (mood === 'help')     return <Path d={`M ${r - mouthR * 0.8} ${mouthY + mouthR * 0.4} Q ${r} ${mouthY - mouthR * 0.6} ${r + mouthR * 0.8} ${mouthY + mouthR * 0.4}`} stroke={color} strokeWidth={r * 0.1} fill="none" strokeLinecap="round" />;
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={r} cy={r} r={r * 0.92} fill="white" stroke={color} strokeWidth={r * 0.1} />
      <Circle cx={r - eyeX} cy={eyeY} r={eyeR} fill={color} />
      <Circle cx={r + eyeX} cy={eyeY} r={eyeR} fill={color} />
      {getMouth()}
    </Svg>
  );
}

function CalendarIcon({ hasItems }: { hasItems: boolean }) {
  return (
    <View style={styles.calendarIconWrap}>
      <Svg width={28} height={28} viewBox="0 0 28 28">
        <Rect x="3" y="5" width="22" height="20" rx="4" fill="none" stroke="#718096" strokeWidth="2" />
        <Line x1="3" y1="11" x2="25" y2="11" stroke="#718096" strokeWidth="2" />
        <Line x1="9" y1="3" x2="9" y2="8" stroke="#718096" strokeWidth="2" strokeLinecap="round" />
        <Line x1="19" y1="3" x2="19" y2="8" stroke="#718096" strokeWidth="2" strokeLinecap="round" />
        <Line x1="9" y1="16" x2="19" y2="16" stroke="#718096" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="9" y1="20" x2="15" y2="20" stroke="#718096" strokeWidth="1.5" strokeLinecap="round" />
      </Svg>
      {hasItems && <View style={styles.calendarDot} />}
    </View>
  );
}

const MOODS: { label: string; color: string; mood: SmileyProps['mood']; isEmergency?: boolean; value: number }[] = [
  { label: 'Super',    color: '#1a9e5c', mood: 'great',    value: 1 },
  { label: 'Gut',      color: '#7cc87a', mood: 'good',     value: 2 },
  { label: 'Ok',       color: '#d4d44a', mood: 'okay',     value: 3 },
  { label: 'Nicht so', color: '#e8c020', mood: 'bad',      value: 4 },
  { label: 'Schlecht', color: '#e87820', mood: 'terrible', value: 5 },
  { label: 'Hilfe',    color: '#cc1111', mood: 'help',     value: 6, isEmergency: true },
];

interface Medication {
  id: number;
  name: string;
  dose: string;
  intake_time: string;
  food_required: boolean;
  taken: boolean;
  logged: boolean;
}

type OverlayStep = 'mood' | 'food' | 'intake';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayStep, setOverlayStep] = useState<OverlayStep>('mood');
  const [activeMed, setActiveMed] = useState<Medication | null>(null);
  const [selectedWellbeing, setSelectedWellbeing] = useState<number>(3);
  const [foodEaten, setFoodEaten] = useState(false);
  const [emergencyVisible, setEmergencyVisible] = useState(false);
  const [selectedMoodValue, setSelectedMoodValue] = useState<number | null>(null);

  const now = new Date();
  const timeString = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const caregiver = { name: 'Maria Hoffmann', emoji: '👩‍⚕️' };

  useEffect(() => { loadMedications(); }, []);

  async function loadMedications() {
    setLoading(true);
    try {
      const data = await api.getIntakeToday();
      setMedications(data);
    } catch {}
    finally { setLoading(false); }
  }

  const missedMeds  = medications.filter(m => m.logged && !m.taken);
  const pendingMeds = medications.filter(m => !m.logged);

  function handleLogout() {
    logout();
    router.replace('/');
  }

  // Wohlbefinden direkt speichern — ohne Overlay
  async function handleMoodHome(mood: typeof MOODS[0]) {
    if (mood.isEmergency) {
      setEmergencyVisible(true);
      return;
    }
    setSelectedMoodValue(mood.value);
    try {
      await api.logWellbeing(mood.value);
    } catch {}
  }

  function openOverlay(med: Medication) {
    setActiveMed(med);
    setOverlayStep('mood');
    setSelectedWellbeing(3);
    setFoodEaten(false);
    setOverlayVisible(true);
  }

  function handleMoodSelect(mood: typeof MOODS[0]) {
    if (mood.isEmergency) {
      setOverlayVisible(false);
      setEmergencyVisible(true);
      return;
    }
    setSelectedWellbeing(mood.value);
    if (activeMed?.food_required) {
      setOverlayStep('food');
    } else {
      setOverlayStep('intake');
    }
  }

  function handleFood(eaten: boolean) {
    setFoodEaten(eaten);
    setOverlayStep('intake');
  }

  async function handleIntake(taken: boolean) {
    if (activeMed) {
      try {
        await api.logIntake({
          medication_id: activeMed.id,
          taken,
          food_eaten: foodEaten,
          wellbeing: selectedWellbeing,
        });
        await loadMedications();
      } catch {}
    }
    setOverlayVisible(false);
  }

  function handleEmergencyConfirm() {
    setEmergencyVisible(false);
    Linking.openURL('tel:112');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.avatar} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.avatarText}>👤</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.welcomeText}>Hallo {user?.name?.split(' ')[0] ?? 'Sarah'}!</Text>
              <Text style={styles.dateText}>{dateString}</Text>
              <Text style={styles.timeText}>{timeString}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowAll(!showAll)} activeOpacity={0.7}>
            <CalendarIcon hasItems={pendingMeds.length > 0} />
          </TouchableOpacity>
        </View>

        {/* Laden */}
        {loading && <Text style={styles.loadingText}>Medikamente werden geladen...</Text>}

        {/* Ausstehende Einnahmen */}
        {showAll && pendingMeds.length > 0 && (
          <View style={styles.pendingList}>
            {pendingMeds.map((med) => (
              <View key={med.id} style={styles.medCard}>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDose}>{med.dose} · {med.intake_time} Uhr</Text>
                </View>
                <TouchableOpacity style={styles.takeBtn} onPress={() => openOverlay(med)}>
                  <Text style={styles.takeBtnText}>Einnehmen</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Wohlbefindens-Karte */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>🧡</Text>
          <Text style={styles.cardTitle}>Wie geht es dir gerade?</Text>
          <View style={styles.moodGrid}>
            {MOODS.map((mood, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.moodBtn,
                  selectedMoodValue === mood.value && { borderWidth: 2, borderColor: mood.color },
                ]}
                onPress={() => handleMoodHome(mood)}
                activeOpacity={0.75}
              >
                <Smiley color={mood.color} size={64} mood={mood.mood} />
                <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Verpasste Einnahmen */}
        {missedMeds.length > 0 && (
          <>
            <Text style={styles.sectionTitleMissed}>⚠ Bitte Nachholen =)</Text>
            {missedMeds.map((med) => (
              <View key={med.id} style={[styles.medCard, styles.medCardMissed]}>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDose}>{med.dose} · {med.intake_time} Uhr</Text>
                </View>
                <TouchableOpacity style={styles.takeBtnMissed} onPress={() => openOverlay(med)}>
                  <Text style={styles.takeBtnText}>Nachholen</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Alles erledigt */}
        {!loading && missedMeds.length === 0 && pendingMeds.length === 0 && medications.length > 0 && (
          <View style={styles.allDone}>
            <Text style={styles.allDoneEmoji}>🌿</Text>
            <Text style={styles.allDoneText}>Alles für heute erledigt!</Text>
          </View>
        )}

        {/* Keine Medikamente */}
        {!loading && medications.length === 0 && (
          <View style={styles.allDone}>
            <Text style={styles.allDoneEmoji}>💊</Text>
            <Text style={styles.allDoneText}>Noch keine Medikamente zugewiesen.</Text>
          </View>
        )}

        <Text style={styles.watermark}>CareThiq</Text>

        {/* Demo Button */}
        {medications.length > 0 && (
          <TouchableOpacity style={styles.demoBtn} onPress={() => openOverlay(medications[0])} activeOpacity={0.8}>
            <Text style={styles.demoBtnText}>Demo: Overlay öffnen</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      {/* ── Einnahme Overlay ── */}
      <Modal visible={overlayVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <View style={styles.overlayHeader}>
              <View style={styles.overlayCaregiver}>
                <View style={styles.overlayCaregiverAvatar}>
                  <Text style={styles.overlayCaregiverEmoji}>{caregiver.emoji}</Text>
                </View>
                <Text style={styles.overlayCaregiverName}>{caregiver.name}</Text>
              </View>
              <Text style={styles.overlayTime}>{timeString}</Text>
            </View>

            {overlayStep === 'mood' && (
              <View style={styles.overlayContent}>
                <Text style={styles.overlayTitle}>Hallo, wie geht es dir? =)</Text>
                <View style={styles.overlayMoodGrid}>
                  {MOODS.map((mood, i) => (
                    <TouchableOpacity key={i} style={styles.overlayMoodBtn} onPress={() => handleMoodSelect(mood)} activeOpacity={0.75}>
                      <Smiley color={mood.color} size={52} mood={mood.mood} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {overlayStep === 'food' && (
              <View style={styles.overlayContent}>
                <Text style={styles.overlayTitle}>Hast du schon{'\n'}was gegessen?</Text>
                <Text style={styles.overlaySub}>{activeMed?.name} sollte mit Essen eingenommen werden.</Text>
                <TouchableOpacity style={styles.overlayBtnYes} onPress={() => handleFood(true)}>
                  <Text style={styles.overlayBtnText}>🍽 Ja, habe ich!</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.overlayBtnNo} onPress={() => handleFood(false)}>
                  <Text style={styles.overlayBtnNoText}>🍎 Noch nicht.</Text>
                </TouchableOpacity>
              </View>
            )}

            {overlayStep === 'intake' && (
              <View style={styles.overlayContent}>
                <Text style={styles.overlayTitle}>Hast du{'\n'}<Text style={styles.overlayAccent}>{activeMed?.name}</Text>{'\n'}genommen?</Text>
                <Text style={styles.overlaySub}>{activeMed?.dose}</Text>
                <TouchableOpacity style={styles.overlayBtnYes} onPress={() => handleIntake(true)}>
                  <Text style={styles.overlayBtnText}>✓ Ja, genommen!</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.overlayBtnNo} onPress={() => handleIntake(false)}>
                  <Text style={styles.overlayBtnNoText}>✗ Noch nicht.</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Notfall Overlay ── */}
      <Modal visible={emergencyVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyTitle}>HILFE?</Text>
            <View style={styles.emergencyButtons}>
              <TouchableOpacity style={styles.emergencyBtnNo} onPress={() => setEmergencyVisible(false)} activeOpacity={0.75}>
                <Svg width={65} height={65} viewBox="0 0 48 48">
                  <Circle cx="24" cy="24" r="22" fill="#fff0f0" stroke="#cc1111" strokeWidth="2" />
                  <Circle cx="24" cy="24" r="18" fill="white" stroke="#cc1111" strokeWidth="1.5" />
                  <Line x1="16" y1="16" x2="32" y2="32" stroke="#cc1111" strokeWidth="3" strokeLinecap="round" />
                  <Line x1="32" y1="16" x2="16" y2="32" stroke="#cc1111" strokeWidth="3" strokeLinecap="round" />
                </Svg>
                <Text style={styles.emergencyBtnNoText}>Nein</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.emergencyBtnYes} onPress={handleEmergencyConfirm} activeOpacity={0.75}>
                <Svg width={95} height={95} viewBox="0 0 48 48">
                  <Circle cx="24" cy="24" r="22" fill="#e8f7f0" stroke="#1a9e5c" strokeWidth="2" />
                  <Circle cx="24" cy="24" r="18" fill="white" stroke="#1a9e5c" strokeWidth="1.5" />
                  <Path d="M16 24 C16 18 20 14 24 14 C28 14 32 18 32 22 C32 26 28 28 26 30 L24 34 L22 30 C20 28 16 28 16 24Z" fill="#1a9e5c" />
                  <Circle cx="24" cy="20" r="3" fill="white" />
                </Svg>
                <Text style={styles.emergencyBtnYesText}>Ja!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f7f5' },
  scroll: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#d8ede8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32 },
  welcomeText: { fontSize: 33, fontWeight: '800', color: '#2d3748' },
  dateText: { fontSize: 27, color: '#4a5568', marginTop: 2 },
  timeText: { fontSize: 25, fontWeight: '700', color: '#2d3748', marginTop: 2 },
  calendarIconWrap: { position: 'relative', padding: 4, marginRight: 40 },
  calendarDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#1a9e5c', borderWidth: 2, borderColor: '#f0f7f5' },
  loadingText: { fontSize: 15, color: '#718096', textAlign: 'center', padding: 20 },
  pendingList: { marginBottom: 8 },
  card: { backgroundColor: '#fef3e2', borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  cardIcon: { fontSize: 24, marginBottom: 10 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#2d3748', marginBottom: 20 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  moodBtn: { width: '30%', aspectRatio: 0.9, borderRadius: 20, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, paddingVertical: 10 },
  moodLabel: { fontSize: 13, fontWeight: '700', marginTop: 6 },
  sectionTitleMissed: { fontSize: 20, fontWeight: '800', color: '#cc1111', marginBottom: 12 },
  medCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  medCardMissed: { backgroundColor: '#fff0f0', borderLeftWidth: 4, borderLeftColor: '#cc1111' },
  medInfo: { flex: 1 },
  medName: { fontSize: 25, fontWeight: '700', color: '#2d3748' },
  medDose: { fontSize: 19, color: '#718096', marginTop: 4 },
  takeBtn: { backgroundColor: '#4db89e', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 50 },
  takeBtnMissed: { backgroundColor: '#cc1111', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 50 },
  takeBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  allDone: { alignItems: 'center', padding: 40 },
  allDoneEmoji: { fontSize: 60, marginBottom: 12 },
  allDoneText: { fontSize: 20, fontWeight: '700', color: '#4db89e' },
  watermark: { textAlign: 'center', fontSize: 40, fontWeight: '800', color: 'rgba(77, 184, 158, 0.1)', marginTop: 40, letterSpacing: -2 },
  demoBtn: { backgroundColor: '#5b8dee', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  demoBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  overlayCard: { width: '100%', backgroundColor: '#fffdfb', borderRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12 },
  overlayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.6)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  overlayCaregiver: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  overlayCaregiverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#d8ede8', alignItems: 'center', justifyContent: 'center' },
  overlayCaregiverEmoji: { fontSize: 22 },
  overlayCaregiverName: { fontSize: 15, fontWeight: '700', color: '#2d3748' },
  overlayTime: { fontSize: 15, fontWeight: '700', color: '#718096' },
  overlayContent: { padding: 24 },
  overlayTitle: { fontSize: 26, fontWeight: '800', color: '#2d3748', marginBottom: 20, lineHeight: 34 },
  overlayAccent: { color: '#4db89e' },
  overlaySub: { fontSize: 16, color: '#718096', marginBottom: 24 },
  overlayMoodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  overlayMoodBtn: { width: '30%', aspectRatio: 1, borderRadius: 16, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', paddingBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  overlayBtnYes: { backgroundColor: '#4db89e', borderRadius: 50, padding: 18, alignItems: 'center', marginBottom: 12, shadowColor: '#4db89e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  overlayBtnText: { color: 'white', fontSize: 18, fontWeight: '800' },
  overlayBtnNo: { backgroundColor: 'white', borderRadius: 50, padding: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  overlayBtnNoText: { color: '#718096', fontSize: 18, fontWeight: '800' },
  emergencyCard: { width: '100%', backgroundColor: '#fffdfb', borderRadius: 28, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12 },
  emergencyTitle: { fontSize: 28, fontWeight: '800', color: '#2d3748', textAlign: 'center', lineHeight: 38, marginBottom: 32 },
  emergencyButtons: { flexDirection: 'row', gap: 40, justifyContent: 'center', alignItems: 'flex-end' },
  emergencyBtnNo: { alignItems: 'center', gap: 8 },
  emergencyBtnNoText: { fontSize: 16, fontWeight: '700', color: '#cc1111' },
  emergencyBtnYes: { alignItems: 'center', gap: 8 },
  emergencyBtnYesText: { fontSize: 16, fontWeight: '700', color: '#1a9e5c' },
});