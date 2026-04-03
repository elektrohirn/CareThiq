import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddressAutocomplete, AddressResult } from '../components/AddressAutocomplete';
import { DatePicker, DateValue, calculateAge, formatDate } from '../components/DatePicker';
import { MedicationAutocomplete, MedicationResult } from '../components/MedicationAutocomplete';
import { TimePicker } from '../components/TimePicker';
import { useAuth } from '../context/AuthContext';
import { PatientLocation, useProximity } from '../hooks/useProximity';
import { api } from '../services/api';

const BEHAVIOR_TAGS = [
  { label: 'Gut gelaunt',   color: '#1a9e5c', bg: '#e8f7f0' },
  { label: 'Kooperativ',    color: '#4db89e', bg: '#e8f7f0' },
  { label: 'Unruhig',       color: '#e8c020', bg: '#fef9e7' },
  { label: 'Vergesslich',   color: '#e8a020', bg: '#fef3e2' },
  { label: 'Zurückgezogen', color: '#718096', bg: '#f7fafc' },
  { label: 'Verwirrt',      color: '#e87820', bg: '#fff3e0' },
  { label: 'Schmerzen',     color: '#cc1111', bg: '#fff0f0' },
  { label: 'Aggressiv',     color: '#9b1111', bg: '#ffe8e8' },
  { label: 'Lethargisch',   color: '#5b6b7c', bg: '#edf2f7' },
];

type TabType = 'medikation' | 'tags' | 'vitals' | 'bericht';

interface MedStatus {
  id: number;
  name: string;
  dose: string;
  intake_time: string;
  food_required: boolean;
  ingredient?: string;
  taken: boolean;        // heutiger Einnahmestatus — nur für Anzeige, nie zum Filtern
}

interface Patient {
  id: number;
  name: string;
  email: string;
  birthdate: string;
  room: string;
  address: string;
  latitude: number;
  longitude: number;
  medications: Medication[];
  med_status?: MedStatus[]; // vom Backend geliefert, enthält taken-Flag
}

interface Medication {
  id: number;
  name: string;
  dose: string;
  intake_time: string;
  food_required: boolean;
  ingredient?: string;
}

interface LocalNote {
  patientId: number;
  tags: string[];
  note: string;
  blutdruck: string;
  puls: string;
  gewicht: string;
}

const DEFAULT_BIRTHDATE: DateValue = { day: 1, month: 1, year: 1950 };

function birthdateToString(d: DateValue): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function stringToBirthdate(s: string): DateValue {
  if (!s) return DEFAULT_BIRTHDATE;
  const parts = s.split('-');
  if (parts.length !== 3) return DEFAULT_BIRTHDATE;
  return { year: parseInt(parts[0]), month: parseInt(parts[1]), day: parseInt(parts[2]) };
}

function ageFromString(s: string): number {
  if (!s) return 0;
  return calculateAge(stringToBirthdate(s));
}

export default function CaregiverScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<TabType>('medikation');

  const [patientFormVisible, setPatientFormVisible] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPassword, setPPassword] = useState('');
  const [pBirthdate, setPBirthdate] = useState<DateValue>(DEFAULT_BIRTHDATE);
  const [pRoom, setPRoom] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [pLat, setPLat] = useState(0);
  const [pLon, setPLon] = useState(0);

  const [localNotes, setLocalNotes] = useState<LocalNote[]>([]);

  const [addMedMode, setAddMedMode] = useState(false);
  const [editMed, setEditMed] = useState<Medication | null>(null);
  const [newName, setNewName] = useState('');
  const [newDose, setNewDose] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newIngredient, setNewIngredient] = useState('');
  const [foodRequired, setFoodRequired] = useState(false);

  const [proximityDismissed, setProximityDismissed] = useState<number[]>([]);
  const patientLocations: PatientLocation[] = patients
    .filter(p => p.latitude && p.longitude)
    .map(p => ({ patientId: p.id, name: p.name, address: p.address, latitude: p.latitude, longitude: p.longitude }));
  const { nearby } = useProximity(patientLocations);
  const visibleNearby = nearby.filter(p => !proximityDismissed.includes(p.patientId));

  const now = new Date();
  const timeString = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPatients();
      setPatients(data);
      setLocalNotes(prev => {
        const existing = new Set(prev.map(n => n.patientId));
        const newNotes = data
          .filter((p: Patient) => !existing.has(p.id))
          .map((p: Patient) => ({ patientId: p.id, tags: [], note: '', blutdruck: '', puls: '', gewicht: '' }));
        return [...prev, ...newNotes];
      });
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  function handleLogout() { logout(); router.replace('/'); }

  function openNewPatient() {
    setEditPatient(null);
    setPName(''); setPEmail(''); setPPassword('test123');
    setPBirthdate(DEFAULT_BIRTHDATE); setPRoom(''); setPAddress('');
    setPLat(0); setPLon(0);
    setPatientFormVisible(true);
  }

  function openEditPatient(p: Patient) {
    setEditPatient(p);
    setPName(p.name); setPEmail(p.email); setPPassword('');
    setPBirthdate(stringToBirthdate(p.birthdate));
    setPRoom(p.room ?? ''); setPAddress(p.address ?? '');
    setPLat(p.latitude ?? 0); setPLon(p.longitude ?? 0);
    setPatientFormVisible(true);
  }

  async function savePatient() {
    if (!pName.trim() || !pAddress.trim()) {
      Alert.alert('Fehlende Angaben', 'Name und Adresse sind Pflichtfelder.');
      return;
    }
    try {
      if (editPatient) {
        await api.updatePatient(editPatient.id, {
          name: pName.trim(),
          birthdate: birthdateToString(pBirthdate),
          room: pRoom.trim(),
          address: pAddress.trim(),
          latitude: pLat,
          longitude: pLon,
        });
      } else {
        if (!pEmail.trim()) {
          Alert.alert('Fehlende Angaben', 'E-Mail ist Pflichtfeld für neue Patienten.');
          return;
        }
        await api.addPatient({
          name: pName.trim(),
          email: pEmail.trim(),
          password: pPassword || 'changeme',
          birthdate: birthdateToString(pBirthdate),
          room: pRoom.trim(),
          address: pAddress.trim(),
          latitude: pLat,
          longitude: pLon,
        });
      }
      await loadPatients();
      setPatientFormVisible(false);
    } catch (e: any) {
      Alert.alert('Fehler', e.message);
    }
  }

  async function deletePatient(id: number) {
    Alert.alert('Patient löschen', 'Wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => {
        try {
          await api.deletePatient(id);
          await loadPatients();
          setPatientFormVisible(false);
        } catch (e: any) {
          Alert.alert('Fehler', e.message);
        }
      }},
    ]);
  }

  function getNote(patientId: number): LocalNote {
    return localNotes.find(n => n.patientId === patientId) ?? { patientId, tags: [], note: '', blutdruck: '', puls: '', gewicht: '' };
  }

  function updateNote(patientId: number, update: Partial<LocalNote>) {
    setLocalNotes(prev => {
      const exists = prev.find(n => n.patientId === patientId);
      if (exists) return prev.map(n => n.patientId === patientId ? { ...n, ...update } : n);
      return [...prev, { patientId, tags: [], note: '', blutdruck: '', puls: '', gewicht: '', ...update }];
    });
  }

  function toggleTag(patientId: number, tag: string) {
    const note = getNote(patientId);
    const tags = note.tags.includes(tag) ? note.tags.filter(t => t !== tag) : [...note.tags, tag];
    updateNote(patientId, { tags });
  }

  async function saveTags(patientId: number) {
    const note = getNote(patientId);
    if (note.tags.length === 0) return;
    try {
      await api.addBehavior({ patient_id: patientId, tags: note.tags });
      Alert.alert('Gespeichert', 'Verhaltens-Tags wurden gespeichert.');
    } catch (e: any) { Alert.alert('Fehler', e.message); }
  }

  async function saveVitals(patientId: number) {
    const note = getNote(patientId);
    if (!note.blutdruck && !note.puls && !note.gewicht) return;
    try {
      await api.addVital({
        patient_id: patientId,
        blutdruck: note.blutdruck || undefined,
        puls: note.puls ? Number(note.puls) : undefined,
        gewicht: note.gewicht ? Number(note.gewicht) : undefined,
      });
      Alert.alert('Gespeichert', 'Vitalwerte wurden gespeichert.');
    } catch (e: any) { Alert.alert('Fehler', e.message); }
  }

  function resetMedForm() {
    setNewName(''); setNewDose(''); setNewTime('08:00');
    setNewIngredient(''); setFoodRequired(false); setEditMed(null); setAddMedMode(false);
  }

  function openEditMed(med: Medication) {
    setEditMed(med);
    setNewName(med.name); setNewDose(med.dose);
    setNewTime(med.intake_time); setFoodRequired(med.food_required);
    setNewIngredient(med.ingredient ?? '');
    setAddMedMode(true);
  }

  // Gibt die vollständige Medikamentenliste für einen Patienten zurück.
  // Bevorzugt med_status (enthält taken-Flag), fällt auf medications zurück.
  // NIEMALS filtern nach taken — alle Medikamente immer anzeigen.
  function getMedList(patient: Patient): MedStatus[] {
    if (patient.med_status && patient.med_status.length > 0) {
      return patient.med_status;
    }
    // Fallback: medications ohne taken-Info → taken als false annehmen
    return (patient.medications ?? []).map(m => ({ ...m, taken: false }));
  }

  async function saveMed(patientId: number) {
    if (!newName.trim() || !newDose.trim()) return;
    try {
      if (editMed) {
        await api.updatePatientMedication(patientId, editMed.id, {
          name: newName.trim(), dose: newDose.trim(),
          intake_time: newTime, food_required: foodRequired, ingredient: newIngredient,
        });
      } else {
        await api.addPatientMedication(patientId, {
          name: newName.trim(), dose: newDose.trim(),
          intake_time: newTime, food_required: foodRequired, ingredient: newIngredient,
        });
      }
      // Nach Speichern: komplette Patientenliste neu laden damit med_status aktuell ist
      await loadPatients();
      // selectedPatient mit frischen Daten aktualisieren
      setPatients(prev => {
        const updated = prev.find(p => p.id === patientId);
        if (updated) setSelectedPatient(updated);
        return prev;
      });
      resetMedForm();
    } catch (e: any) { Alert.alert('Fehler', e.message); }
  }

  async function deleteMed(patientId: number, medId: number) {
    try {
      await api.deletePatientMedication(patientId, medId);
      await loadPatients();
      setPatients(prev => {
        const updated = prev.find(p => p.id === patientId);
        if (updated) setSelectedPatient(updated);
        return prev;
      });
    } catch (e: any) { Alert.alert('Fehler', e.message); }
  }

  function openPatient(patient: Patient) {
    setSelectedPatient(patient);
    setActiveSection('medikation');
    setDetailVisible(true);
    resetMedForm();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.avatar} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.avatarText}>👩‍⚕️</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.welcomeText}>Hallo {user?.name?.split(' ')[0]}!</Text>
              <Text style={styles.dateText}>{dateString}</Text>
              <Text style={styles.timeText}>{timeString}</Text>
            </View>
          </View>
        </View>

        {visibleNearby.length > 0 && (
          <View style={styles.proximityBanner}>
            <Text style={styles.proximityTitle}>📍 In der Nähe</Text>
            {visibleNearby.map(p => (
              <View key={p.patientId} style={styles.proximityRow}>
                <View style={styles.proximityInfo}>
                  <Text style={styles.proximityName}>{p.name}</Text>
                  <Text style={styles.proximityAddress}>{p.address}</Text>
                </View>
                <View style={styles.proximityActions}>
                  <TouchableOpacity style={styles.proximityOpenBtn} onPress={() => { const patient = patients.find(pt => pt.id === p.patientId); if (patient) openPatient(patient); }} activeOpacity={0.8}>
                    <Text style={styles.proximityOpenBtnText}>Öffnen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.proximityDismissBtn} onPress={() => setProximityDismissed(prev => [...prev, p.patientId])}>
                    <Text style={styles.proximityDismissBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meine Patienten</Text>
          <TouchableOpacity style={styles.addPatientBtn} onPress={openNewPatient} activeOpacity={0.8}>
            <Text style={styles.addPatientBtnText}>+ Patient</Text>
          </TouchableOpacity>
        </View>

        {loading && <Text style={styles.loadingText}>Lade Patienten...</Text>}

        {!loading && patients.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyText}>Noch keine Patienten angelegt.</Text>
          </View>
        )}

        {patients.map(patient => {
          const note = getNote(patient.id);
          return (
            <TouchableOpacity key={patient.id} style={styles.patientCard} onPress={() => openPatient(patient)} activeOpacity={0.8}>
              <View style={styles.patientAvatar}>
                <Text style={styles.patientAvatarText}>👤</Text>
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientMeta}>{patient.birthdate ? `${ageFromString(patient.birthdate)} Jahre · ` : ''}{patient.room || patient.address}</Text>
                {note.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {note.tags.slice(0, 3).map(tag => {
                      const t = BEHAVIOR_TAGS.find(b => b.label === tag)!;
                      return (
                        <View key={tag} style={[styles.tagChip, { backgroundColor: t.bg }]}>
                          <Text style={[styles.tagChipText, { color: t.color }]}>{tag}</Text>
                        </View>
                      );
                    })}
                    {note.tags.length > 3 && <Text style={styles.tagMore}>+{note.tags.length - 3}</Text>}
                  </View>
                )}
              </View>
              <View style={styles.patientCardRight}>
                <TouchableOpacity style={styles.editPatientBtn} onPress={() => openEditPatient(patient)} activeOpacity={0.8}>
                  <Text style={styles.editPatientBtnText}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statsBtn} onPress={() => router.push({ pathname: '/stats', params: { patientId: patient.id, patientName: patient.name } })} activeOpacity={0.8}>
                  <Text style={styles.statsBtnText}>📊</Text>
                </TouchableOpacity>
                <Text style={styles.patientArrow}>›</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.watermark}>CareThiq</Text>

      </ScrollView>

      {/* ── Patient Form Modal ── */}
      <Modal visible={patientFormVisible} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalPatientName}>{editPatient ? 'Patient bearbeiten' : 'Neuer Patient'}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setPatientFormVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.section}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput style={styles.input} placeholder="Vor- und Nachname" placeholderTextColor="#4a5568" value={pName} onChangeText={setPName} />
                {!editPatient && (
                  <>
                    <Text style={styles.formLabel}>E-Mail *</Text>
                    <TextInput style={styles.input} placeholder="patient@email.de" placeholderTextColor="#4a5568" value={pEmail} onChangeText={setPEmail} autoCapitalize="none" keyboardType="email-address" />
                    <Text style={styles.formLabel}>Passwort</Text>
                    <TextInput style={styles.input} placeholder="test123" placeholderTextColor="#4a5568" value={pPassword} onChangeText={setPPassword} />
                  </>
                )}
                <Text style={styles.formLabel}>Geburtsdatum</Text>
                <DatePicker value={pBirthdate} onChange={setPBirthdate} />
                <Text style={styles.formHint}>Alter: {calculateAge(pBirthdate)} Jahre · Geb. {formatDate(pBirthdate)}</Text>
                <Text style={styles.formLabel}>Zimmer / Wohneinheit</Text>
                <TextInput style={styles.input} placeholder="z.B. Zimmer 12" placeholderTextColor="#4a5568" value={pRoom} onChangeText={setPRoom} />
                <Text style={styles.formLabel}>Adresse *</Text>
                <AddressAutocomplete
                  value={pAddress}
                  onChange={setPAddress}
                  onSelect={(result: AddressResult) => {
                    setPAddress(result.display_name);
                    setPLat(parseFloat(result.lat));
                    setPLon(parseFloat(result.lon));
                  }}
                />
                <Text style={styles.formHint}>Adresse aus Vorschlägen wählen für GPS-Erkennung.</Text>
                <View style={styles.formButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setPatientFormVisible(false)} activeOpacity={0.8}>
                    <Text style={styles.cancelBtnText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={savePatient} activeOpacity={0.8}>
                    <Text style={styles.saveBtnText}>Speichern</Text>
                  </TouchableOpacity>
                </View>
                {editPatient && (
                  <TouchableOpacity style={styles.deletePatientBtn} onPress={() => deletePatient(editPatient.id)} activeOpacity={0.8}>
                    <Text style={styles.deletePatientBtnText}>Patient löschen</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Patient Detail Modal ── */}
      {selectedPatient && (
        <Modal visible={detailVisible} transparent animationType="slide" statusBarTranslucent>
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalPatientName}>{selectedPatient.name}</Text>
                  <Text style={styles.modalPatientMeta}>{selectedPatient.birthdate ? `${ageFromString(selectedPatient.birthdate)} Jahre · ` : ''}{selectedPatient.room || selectedPatient.address}</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => { setDetailVisible(false); resetMedForm(); }}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.tabBar}>
                {(['medikation', 'tags', 'vitals', 'bericht'] as const).map(tab => (
                  <TouchableOpacity key={tab} style={[styles.tab, activeSection === tab && styles.tabActive]} onPress={() => { setActiveSection(tab); resetMedForm(); }}>
                    <Text style={[styles.tabText, activeSection === tab && styles.tabTextActive]}>
                      {tab === 'medikation' ? 'Medikation' : tab === 'tags' ? 'Verhalten' : tab === 'vitals' ? 'Vitalwerte' : 'Bericht'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={styles.modalScroll}>

                {activeSection === 'medikation' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Medikation</Text>

                    {/* BUGFIX: getMedList() gibt IMMER alle Medikamente zurück,
                        unabhängig vom taken-Status. taken wird nur als Indikator angezeigt. */}
                    {getMedList(selectedPatient).map(med => (
                      <View key={med.id} style={styles.medCard}>
                        {/* Einnahme-Indikator: grün = heute eingenommen, grau = ausstehend */}
                        <View style={[styles.takenIndicator, med.taken ? styles.takenIndicatorDone : styles.takenIndicatorPending]}>
                          <Text style={styles.takenIndicatorText}>{med.taken ? '✓' : '○'}</Text>
                        </View>
                        <View style={styles.medInfo}>
                          <Text style={styles.medName}>{med.name}</Text>
                          <Text style={styles.medDose}>{med.dose} · {med.intake_time} Uhr{med.food_required ? ' · 🍽' : ''}</Text>
                          {med.ingredient ? <Text style={styles.medIngredient}>Wirkstoff: {med.ingredient}</Text> : null}
                          <Text style={[styles.medTakenLabel, med.taken ? styles.medTakenLabelDone : styles.medTakenLabelPending]}>
                            {med.taken ? 'Heute eingenommen' : 'Ausstehend'}
                          </Text>
                        </View>
                        <View style={styles.medActions}>
                          <TouchableOpacity style={styles.editBtn} onPress={() => openEditMed(med)}>
                            <Text style={styles.editBtnText}>✎</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteMed(selectedPatient.id, med.id)}>
                            <Text style={styles.deleteBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    {!addMedMode ? (
                      <TouchableOpacity style={styles.addBtn} onPress={() => setAddMedMode(true)} activeOpacity={0.8}>
                        <Text style={styles.addBtnText}>+ Medikament hinzufügen</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.form}>
                        <Text style={styles.formTitle}>{editMed ? 'Bearbeiten' : 'Neues Medikament'}</Text>
                        <Text style={styles.formLabel}>Name</Text>
                        <MedicationAutocomplete
                          value={newName}
                          onChange={setNewName}
                          onSelect={(result: MedicationResult) => {
                            setNewName(result.name);
                            setNewIngredient(result.ingredient);
                          }}
                          placeholder="z.B. Ramipril"
                          darkMode={true}
                        />
                        {newIngredient ? <Text style={styles.ingredientHint}>Wirkstoff: {newIngredient}</Text> : null}
                        <Text style={styles.formLabel}>Dosis</Text>
                        <TextInput style={styles.input} placeholder="z.B. 5mg" placeholderTextColor="#4a5568" value={newDose} onChangeText={setNewDose} />
                        <Text style={styles.formLabel}>Uhrzeit</Text>
                        <TimePicker value={newTime} onChange={setNewTime} />
                        <TouchableOpacity style={[styles.foodToggle, foodRequired && styles.foodToggleActive]} onPress={() => setFoodRequired(f => !f)} activeOpacity={0.8}>
                          <Text style={[styles.foodToggleText, foodRequired && styles.foodToggleTextActive]}>🍽 Mit Essen einnehmen {foodRequired ? '✓' : ''}</Text>
                        </TouchableOpacity>
                        <View style={styles.formButtons}>
                          <TouchableOpacity style={styles.cancelBtn} onPress={resetMedForm} activeOpacity={0.8}>
                            <Text style={styles.cancelBtnText}>Abbrechen</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.saveBtn} onPress={() => saveMed(selectedPatient.id)} activeOpacity={0.8}>
                            <Text style={styles.saveBtnText}>Speichern</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {activeSection === 'tags' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Verhaltens-Tags</Text>
                    <View style={styles.tagGrid}>
                      {BEHAVIOR_TAGS.map(tag => {
                        const note = getNote(selectedPatient.id);
                        const active = note.tags.includes(tag.label);
                        return (
                          <TouchableOpacity key={tag.label} style={[styles.tagBtn, active && { backgroundColor: tag.bg, borderColor: tag.color }]} onPress={() => toggleTag(selectedPatient.id, tag.label)} activeOpacity={0.8}>
                            <Text style={[styles.tagBtnText, active && { color: tag.color }]}>{tag.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <TouchableOpacity style={styles.saveBtn} onPress={() => saveTags(selectedPatient.id)} activeOpacity={0.8}>
                      <Text style={styles.saveBtnText}>Verhalten speichern</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeSection === 'vitals' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Vitalwerte</Text>
                    <View style={styles.vitalRow}>
                      <View style={styles.vitalField}>
                        <Text style={styles.vitalLabel}>Blutdruck</Text>
                        <TextInput style={styles.vitalInput} placeholder="120/80" placeholderTextColor="#4a5568" value={getNote(selectedPatient.id).blutdruck} onChangeText={v => updateNote(selectedPatient.id, { blutdruck: v })} />
                        <Text style={styles.vitalUnit}>mmHg</Text>
                      </View>
                      <View style={styles.vitalField}>
                        <Text style={styles.vitalLabel}>Puls</Text>
                        <TextInput style={styles.vitalInput} placeholder="72" placeholderTextColor="#4a5568" keyboardType="numeric" value={getNote(selectedPatient.id).puls} onChangeText={v => updateNote(selectedPatient.id, { puls: v })} />
                        <Text style={styles.vitalUnit}>bpm</Text>
                      </View>
                      <View style={styles.vitalField}>
                        <Text style={styles.vitalLabel}>Gewicht</Text>
                        <TextInput style={styles.vitalInput} placeholder="68" placeholderTextColor="#4a5568" keyboardType="numeric" value={getNote(selectedPatient.id).gewicht} onChangeText={v => updateNote(selectedPatient.id, { gewicht: v })} />
                        <Text style={styles.vitalUnit}>kg</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.saveBtn} onPress={() => saveVitals(selectedPatient.id)} activeOpacity={0.8}>
                      <Text style={styles.saveBtnText}>Vitalwerte speichern</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeSection === 'bericht' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Pflegebericht</Text>
                    <TextInput style={styles.berichtInput} placeholder="Notizen zum Besuch..." placeholderTextColor="#4a5568" multiline numberOfLines={8} textAlignVertical="top" value={getNote(selectedPatient.id).note} onChangeText={v => updateNote(selectedPatient.id, { note: v })} />
                    <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={() => Alert.alert('Gespeichert', 'Pflegebericht wurde gespeichert.')}>
                      <Text style={styles.saveBtnText}>Bericht speichern</Text>
                    </TouchableOpacity>
                  </View>
                )}

              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },
  scroll: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1e2d3d', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32 },
  welcomeText: { fontSize: 28, fontWeight: '800', color: '#e2e8f0' },
  dateText: { fontSize: 16, color: '#718096', marginTop: 2 },
  timeText: { fontSize: 18, fontWeight: '700', color: '#a0aec0', marginTop: 2 },
  loadingText: { fontSize: 15, color: '#4a5568', textAlign: 'center', padding: 20 },
  proximityBanner: { backgroundColor: '#1a2d1a', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1a9e5c' },
  proximityTitle: { fontSize: 14, fontWeight: '800', color: '#1a9e5c', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  proximityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  proximityInfo: { flex: 1 },
  proximityName: { fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
  proximityAddress: { fontSize: 13, color: '#718096', marginTop: 2 },
  proximityActions: { flexDirection: 'row', gap: 8 },
  proximityOpenBtn: { backgroundColor: '#1a9e5c', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50 },
  proximityOpenBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  proximityDismissBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2d3f50', alignItems: 'center', justifyContent: 'center' },
  proximityDismissBtnText: { color: '#718096', fontWeight: '800', fontSize: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 1 },
  addPatientBtn: { backgroundColor: '#4db89e', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50 },
  addPatientBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  empty: { alignItems: 'center', padding: 60, gap: 12 },
  emptyEmoji: { fontSize: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#4a5568' },
  patientCard: { backgroundColor: '#1e2d3d', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 14 },
  patientAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#2d3f50', alignItems: 'center', justifyContent: 'center' },
  patientAvatarText: { fontSize: 26 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 18, fontWeight: '800', color: '#e2e8f0' },
  patientMeta: { fontSize: 14, color: '#718096', marginTop: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  tagChipText: { fontSize: 12, fontWeight: '700' },
  tagMore: { fontSize: 12, color: '#718096', alignSelf: 'center' },
  patientCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editPatientBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2d3f50', alignItems: 'center', justifyContent: 'center' },
  editPatientBtnText: { color: '#5b8dee', fontWeight: '800', fontSize: 16 },
  statsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2d3f50', alignItems: 'center', justifyContent: 'center' },
  statsBtnText: { fontSize: 18 },
  patientArrow: { fontSize: 24, color: '#4db89e', fontWeight: '300' },
  watermark: { textAlign: 'center', fontSize: 40, fontWeight: '800', color: 'rgba(77, 184, 158, 0.05)', marginTop: 40, letterSpacing: -2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0f1923', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e2d3d' },
  modalPatientName: { fontSize: 22, fontWeight: '800', color: '#e2e8f0' },
  modalPatientMeta: { fontSize: 14, color: '#718096', marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e2d3d', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#718096', fontWeight: '800', fontSize: 14 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 12, gap: 6, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e2d3d' },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1e2d3d', alignItems: 'center' },
  tabActive: { backgroundColor: '#4db89e' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#718096' },
  tabTextActive: { color: 'white' },
  modalScroll: { padding: 20 },
  section: { paddingBottom: 40 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#718096', marginBottom: 6, marginTop: 8 },
  formHint: { fontSize: 12, color: '#4a5568', marginBottom: 12, fontStyle: 'italic' },
  ingredientHint: { fontSize: 12, color: '#4db89e', marginBottom: 8, fontStyle: 'italic' },
  input: { backgroundColor: '#0f1923', borderRadius: 12, padding: 14, fontSize: 15, color: '#e2e8f0', marginBottom: 4, borderWidth: 1, borderColor: '#2d3f50' },
  formButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#0f1923', borderRadius: 50, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2d3f50' },
  cancelBtnText: { color: '#718096', fontWeight: '700', fontSize: 14 },
  saveBtn: { flex: 1, backgroundColor: '#4db89e', borderRadius: 50, padding: 14, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 14 },
  deletePatientBtn: { backgroundColor: '#2d1a1a', borderRadius: 50, padding: 14, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#cc1111' },
  deletePatientBtnText: { color: '#cc1111', fontWeight: '700', fontSize: 14 },
  // Med card mit Einnahme-Indikator
  medCard: { backgroundColor: '#1e2d3d', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  takenIndicator: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  takenIndicatorDone: { backgroundColor: '#1a4a30' },
  takenIndicatorPending: { backgroundColor: '#2d3f50' },
  takenIndicatorText: { fontSize: 14, fontWeight: '800', color: '#e2e8f0' },
  medInfo: { flex: 1 },
  medName: { fontSize: 16, fontWeight: '800', color: '#e2e8f0' },
  medDose: { fontSize: 13, color: '#718096', marginTop: 3 },
  medIngredient: { fontSize: 12, color: '#4db89e', marginTop: 2 },
  medTakenLabel: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  medTakenLabelDone: { color: '#1a9e5c' },
  medTakenLabelPending: { color: '#4a5568' },
  medActions: { flexDirection: 'row', gap: 8 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2d3f50', alignItems: 'center', justifyContent: 'center' },
  editBtnText: { color: '#5b8dee', fontWeight: '800', fontSize: 16 },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2d1a1a', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#cc1111', fontWeight: '800', fontSize: 14 },
  addBtn: { backgroundColor: '#4db89e', borderRadius: 50, padding: 16, alignItems: 'center', marginTop: 8, shadowColor: '#4db89e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  addBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  form: { backgroundColor: '#1e2d3d', borderRadius: 20, padding: 20, marginTop: 8 },
  formTitle: { fontSize: 16, fontWeight: '800', color: '#e2e8f0', marginBottom: 16 },
  foodToggle: { backgroundColor: '#0f1923', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#2d3f50' },
  foodToggleActive: { backgroundColor: '#0d2018', borderColor: '#4db89e' },
  foodToggleText: { fontSize: 14, fontWeight: '700', color: '#718096' },
  foodToggleTextActive: { color: '#4db89e' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  tagBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50, backgroundColor: '#1e2d3d', borderWidth: 1.5, borderColor: '#2d3f50' },
  tagBtnText: { fontSize: 14, fontWeight: '700', color: '#718096' },
  vitalRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  vitalField: { flex: 1, backgroundColor: '#1e2d3d', borderRadius: 16, padding: 16, alignItems: 'center' },
  vitalLabel: { fontSize: 12, fontWeight: '700', color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  vitalInput: { fontSize: 24, fontWeight: '800', color: '#e2e8f0', textAlign: 'center', width: '100%' },
  vitalUnit: { fontSize: 12, color: '#4db89e', fontWeight: '600', marginTop: 4 },
  berichtInput: { backgroundColor: '#1e2d3d', borderRadius: 16, padding: 16, fontSize: 16, color: '#e2e8f0', minHeight: 180, marginBottom: 16 },
});