/**
 * Canonical symptom vocabulary. Keys are stable identifiers used by the
 * safety engine, the question engine, and the knowledge base. Labels are
 * shown in the Spanish-first UI (see master prompt section 40).
 */
export interface SymptomDefinition {
  key: string
  label: string
  labelEs: string
}

export const SYMPTOMS: SymptomDefinition[] = [
  { key: 'fever', label: 'Fever', labelEs: 'Fiebre' },
  { key: 'cough', label: 'Cough', labelEs: 'Tos' },
  { key: 'sore_throat', label: 'Sore throat', labelEs: 'Dolor de garganta' },
  { key: 'headache', label: 'Headache', labelEs: 'Dolor de cabeza' },
  { key: 'nausea', label: 'Nausea', labelEs: 'Náuseas' },
  { key: 'vomiting', label: 'Vomiting', labelEs: 'Vómitos' },
  { key: 'diarrhea', label: 'Diarrhea', labelEs: 'Diarrea' },
  { key: 'abdominal_pain', label: 'Abdominal pain', labelEs: 'Dolor abdominal' },
  { key: 'fatigue', label: 'Fatigue', labelEs: 'Fatiga' },
  { key: 'congestion', label: 'Congestion', labelEs: 'Congestión' },
  { key: 'breathing_difficulty', label: 'Difficulty breathing', labelEs: 'Dificultad respiratoria' },
  { key: 'other', label: 'Other', labelEs: 'Otros' }
]

export const SYMPTOM_KEYS = SYMPTOMS.map((s) => s.key)
