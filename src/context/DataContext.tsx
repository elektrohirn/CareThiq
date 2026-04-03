import { createContext, ReactNode, useContext, useState } from 'react';

// ── Typen ─────────────────────────────────────────────────────────────────────

export interface IntakeEvent {
  id: string;
  patientId: number;
  medicationId: number;
  medicationName: string;
  dose: string;
  timestamp: Date;
  wellbeing: number; // 1-6 (1=super, 6=hilfe)
}

export interface VitalEvent {
  id: string;
  patientId: number;
  timestamp: Date;
  blutdruck?: string;
  puls?: number;
  gewicht?: number;
}

export interface BehaviorEvent {
  id: string;
  patientId: number;
  timestamp: Date;
  tags: string[];
}

interface DataContextType {
  intakeEvents: IntakeEvent[];
  vitalEvents: VitalEvent[];
  behaviorEvents: BehaviorEvent[];
  addIntake: (event: Omit<IntakeEvent, 'id'>) => void;
  addVital: (event: Omit<VitalEvent, 'id'>) => void;
  addBehavior: (event: Omit<BehaviorEvent, 'id'>) => void;
  getEventsInWindow: (patientId: number, hours?: number) => {
    intakes: IntakeEvent[];
    vitals: VitalEvent[];
    behaviors: BehaviorEvent[];
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const DataContext = createContext<DataContextType | null>(null);

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [intakeEvents, setIntakeEvents] = useState<IntakeEvent[]>([]);
  const [vitalEvents, setVitalEvents]   = useState<VitalEvent[]>([]);
  const [behaviorEvents, setBehaviorEvents] = useState<BehaviorEvent[]>([]);

  function addIntake(event: Omit<IntakeEvent, 'id'>) {
    setIntakeEvents(prev => [...prev, { ...event, id: generateId() }]);
  }

  function addVital(event: Omit<VitalEvent, 'id'>) {
    setVitalEvents(prev => [...prev, { ...event, id: generateId() }]);
  }

  function addBehavior(event: Omit<BehaviorEvent, 'id'>) {
    setBehaviorEvents(prev => [...prev, { ...event, id: generateId() }]);
  }

  function getEventsInWindow(patientId: number, hours = 8) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return {
      intakes:   intakeEvents.filter(e => e.patientId === patientId && e.timestamp >= cutoff),
      vitals:    vitalEvents.filter(e => e.patientId === patientId && e.timestamp >= cutoff),
      behaviors: behaviorEvents.filter(e => e.patientId === patientId && e.timestamp >= cutoff),
    };
  }

  return (
    <DataContext.Provider value={{
      intakeEvents, vitalEvents, behaviorEvents,
      addIntake, addVital, addBehavior, getEventsInWindow,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData muss innerhalb von DataProvider verwendet werden');
  return ctx;
}