const API_BASE = 'http://192.168.178.79:5000/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Fehler');
  return data;
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────
  login: (email: string, password: string) =>
    request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => request('/me'),

  // ── Medikamente ───────────────────────────────────────────────────────
  getMedications: () => request('/medications'),

  addMedication: (data: {
    name: string; dose: string; intake_time: string;
    food_required: boolean; ingredient?: string; notes?: string; interval_hours?: number;
  }) => request('/medications', { method: 'POST', body: JSON.stringify(data) }),

  updateMedication: (id: number, data: Partial<{
    name: string; dose: string; intake_time: string;
    food_required: boolean; ingredient: string; notes: string;
  }>) => request(`/medications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteMedication: (id: number) =>
    request(`/medications/${id}`, { method: 'DELETE' }),

  // ── Einnahmen ─────────────────────────────────────────────────────────
  getIntakeToday: () => request('/intake/today'),

  logIntake: (data: {
    medication_id: number; taken: boolean; food_eaten?: boolean; wellbeing?: number;
  }) => request('/intake', { method: 'POST', body: JSON.stringify(data) }),

  // ── Wohlbefinden ──────────────────────────────────────────────────────
  logWellbeing: (value: number) =>
    request('/wellbeing', { method: 'POST', body: JSON.stringify({ value }) }),

  getPatientWellbeing: (patientId: number) =>
    request(`/patients/${patientId}/wellbeing`),

  // ── Patienten (Pfleger) ───────────────────────────────────────────────
  getPatients: () => request('/patients'),

  addPatient: (data: {
    name: string; email: string; password: string;
    birthdate?: string; room?: string; address?: string;
    latitude?: number; longitude?: number;
  }) => request('/patients', { method: 'POST', body: JSON.stringify(data) }),

  updatePatient: (id: number, data: Partial<{
    name: string; birthdate: string; room: string;
    address: string; latitude: number; longitude: number;
  }>) => request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deletePatient: (id: number) =>
    request(`/patients/${id}`, { method: 'DELETE' }),

  getPatientMedications: (patientId: number) =>
    request(`/patients/${patientId}/medications`),

  addPatientMedication: (patientId: number, data: {
    name: string; dose: string; intake_time: string;
    food_required: boolean; ingredient?: string; notes?: string; interval_hours?: number;
  }) => request(`/patients/${patientId}/medications`, { method: 'POST', body: JSON.stringify(data) }),

  updatePatientMedication: (patientId: number, medId: number, data: Partial<{
    name: string; dose: string; intake_time: string;
    food_required: boolean; ingredient: string; notes: string;
  }>) => request(`/patients/${patientId}/medications/${medId}`, { method: 'PUT', body: JSON.stringify(data) }),

  deletePatientMedication: (patientId: number, medId: number) =>
    request(`/patients/${patientId}/medications/${medId}`, { method: 'DELETE' }),

  getPatientIntake: (patientId: number) =>
    request(`/patients/${patientId}/intake`),

  // ── Vitalwerte ────────────────────────────────────────────────────────
  addVital: (data: {
    patient_id: number; blutdruck?: string; puls?: number; gewicht?: number;
  }) => request('/vitals', { method: 'POST', body: JSON.stringify(data) }),

  getVitals: (patientId: number) => request(`/vitals/${patientId}`),

  // ── Verhaltens-Tags ───────────────────────────────────────────────────
  addBehavior: (data: {
    patient_id: number; tags: string[];
  }) => request('/behavior', { method: 'POST', body: JSON.stringify(data) }),

  getBehavior: (patientId: number) => request(`/behavior/${patientId}`),
};