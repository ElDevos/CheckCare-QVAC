import type { AdaptiveQuestion } from '@checkcare/shared-types'

/**
 * Canonical adaptive-question catalog.
 *
 * Each question is deterministic vocabulary shared by the question engine
 * (which decides WHICH of these to ask, based on selected symptoms — see
 * apps/edge/src/assessment/question-engine.ts) and the safety engine (which
 * decides risk level from the answers — see rules.ts). Neither depends on
 * MedPsy to choose or interpret these questions.
 *
 * `triggerSymptoms`: symptom keys that cause the question engine to surface
 * this question. A question can be relevant to more than one symptom group.
 */
export interface QuestionDefinition extends AdaptiveQuestion {
  triggerSymptoms: string[]
}

export const QUESTIONS: QuestionDefinition[] = [
  // --- Breathing / cardiac (NHS: shortness of breath, chest pain) ---
  {
    id: 'q_breathing_severe',
    text: 'Are you having severe difficulty breathing — gasping, choking, or unable to speak in full sentences?',
    textEs: '¿Tienes dificultad respiratoria severa: jadeas, te ahogas o no puedes hablar con frases completas?',
    type: 'boolean',
    triggerSymptoms: ['breathing_difficulty', 'cough', 'fever', 'fatigue']
  },
  {
    id: 'q_skin_blue',
    text: 'Have the lips, skin, or nail beds turned pale, blue, or grey?',
    textEs: '¿Los labios, la piel o las uñas se han puesto pálidos, azulados o grisáceos?',
    type: 'boolean',
    triggerSymptoms: ['breathing_difficulty', 'vomiting', 'diarrhea', 'fever']
  },
  {
    id: 'q_chest_pain_cardiac',
    text: 'Do you have chest pain or pressure that spreads to an arm, neck, jaw, back, or stomach, or comes with sweating, nausea, or lightheadedness?',
    textEs: '¿Tienes dolor u opresión en el pecho que se extiende a un brazo, cuello, mandíbula, espalda o estómago, o se acompaña de sudoración, náuseas o mareo?',
    type: 'boolean',
    triggerSymptoms: ['breathing_difficulty', 'fatigue', 'nausea']
  },
  {
    id: 'q_leg_swelling',
    text: 'Along with breathlessness, do you have pain or swelling in one leg, or heart palpitations?',
    textEs: '¿Junto con la falta de aire, tienes dolor o hinchazón en una pierna, o palpitaciones?',
    type: 'boolean',
    triggerSymptoms: ['breathing_difficulty']
  },
  {
    id: 'q_cough_blood',
    text: 'Are you coughing up blood?',
    textEs: '¿Estás tosiendo sangre?',
    type: 'boolean',
    triggerSymptoms: ['cough', 'breathing_difficulty']
  },

  // --- Neurological / headache (NHS: headaches) ---
  {
    id: 'q_confusion',
    text: 'Is the person confused, unusually drowsy, or difficult to wake?',
    textEs: '¿La persona está confundida, inusualmente somnolienta o le cuesta despertar?',
    type: 'boolean',
    triggerSymptoms: ['fever', 'headache', 'vomiting', 'diarrhea', 'fatigue']
  },
  {
    id: 'q_seizure',
    text: 'Has there been a seizure (fit)?',
    textEs: '¿Ha habido una convulsión?',
    type: 'boolean',
    triggerSymptoms: ['headache', 'fever']
  },
  {
    id: 'q_thunderclap_headache',
    text: 'Did the headache start suddenly and feel extremely severe — the worst you have ever had?',
    textEs: '¿El dolor de cabeza comenzó de forma repentina y es extremadamente intenso, el peor que has tenido?',
    type: 'boolean',
    triggerSymptoms: ['headache']
  },
  {
    id: 'q_neuro_deficit',
    text: 'Do you have numbness or weakness in the face or body, trouble speaking, loss of balance, or loss of vision?',
    textEs: '¿Tienes entumecimiento o debilidad en la cara o el cuerpo, dificultad para hablar, pérdida de equilibrio o de visión?',
    type: 'boolean',
    triggerSymptoms: ['headache']
  },
  {
    id: 'q_stiff_neck_photophobia',
    text: 'Do you have a stiff neck together with sensitivity to bright light, a very high fever, or a rash that does not fade when pressed?',
    textEs: '¿Tienes rigidez de cuello junto con sensibilidad a la luz, fiebre muy alta, o un sarpullido que no desaparece al presionarlo?',
    type: 'boolean',
    triggerSymptoms: ['headache', 'fever']
  },

  // --- GI (NHS: diarrhoea and vomiting) ---
  {
    id: 'q_vomit_blood_or_green',
    text: 'Is there blood in the vomit (or does it look like coffee grounds), or is the vomit green?',
    textEs: '¿Hay sangre en el vómito (o parece posos de café), o el vómito es verde?',
    type: 'boolean',
    triggerSymptoms: ['vomiting', 'nausea']
  },
  {
    id: 'q_severe_abdominal_pain',
    text: 'Is there sudden, severe abdominal pain?',
    textEs: '¿Tienes un dolor abdominal repentino e intenso?',
    type: 'boolean',
    triggerSymptoms: ['abdominal_pain', 'vomiting', 'diarrhea']
  },
  {
    id: 'q_possible_poisoning',
    text: 'Could a poisonous or toxic substance have been swallowed?',
    textEs: '¿Existe la posibilidad de haber ingerido una sustancia tóxica o venenosa?',
    type: 'boolean',
    triggerSymptoms: ['vomiting', 'abdominal_pain', 'nausea']
  },
  {
    id: 'q_bloody_stool',
    text: 'Is there blood in the diarrhea or bleeding from the bottom?',
    textEs: '¿Hay sangre en la diarrea o sangrado rectal?',
    type: 'boolean',
    triggerSymptoms: ['diarrhea']
  },
  {
    id: 'q_gi_duration',
    text: 'Has the diarrhea lasted more than 7 days, or the vomiting more than 2 days?',
    textEs: '¿La diarrea ha durado más de 7 días, o el vómito más de 2 días?',
    type: 'boolean',
    triggerSymptoms: ['diarrhea', 'vomiting']
  },
  {
    id: 'q_cannot_keep_fluids',
    text: 'Are you unable to keep any fluids down?',
    textEs: '¿No puedes retener ningún líquido?',
    type: 'boolean',
    triggerSymptoms: ['vomiting', 'diarrhea', 'nausea']
  },

  // --- Dehydration (NHS: dehydration) ---
  {
    id: 'q_severe_dehydration',
    text: 'Are you passing very little or no urine, and does the skin feel unusually cold or look blotchy?',
    textEs: '¿Orinas muy poco o nada, y la piel se siente inusualmente fría o luce manchada?',
    type: 'boolean',
    triggerSymptoms: ['vomiting', 'diarrhea', 'fever', 'fatigue']
  },
  {
    id: 'q_moderate_dehydration',
    text: 'Do you feel dizzy when standing up and it does not go away, or is your urine dark yellow?',
    textEs: '¿Sientes mareo al ponerte de pie que no desaparece, u orina de color amarillo oscuro?',
    type: 'boolean',
    triggerSymptoms: ['vomiting', 'diarrhea', 'fever', 'fatigue']
  },

  // --- Fever (NHS: fever in adults) ---
  {
    id: 'q_fever_not_improving',
    text: 'Have you been treating the fever at home, but it is not improving or is getting worse?',
    textEs: '¿Has tratado la fiebre en casa, pero no mejora o empeora?',
    type: 'boolean',
    triggerSymptoms: ['fever']
  },

  // --- General duration/severity, always useful context ---
  {
    id: 'q_symptom_worsening',
    text: 'Are your symptoms clearly getting worse over the last few hours, rather than staying the same or improving?',
    textEs: '¿Tus síntomas están empeorando claramente en las últimas horas, en lugar de mantenerse igual o mejorar?',
    type: 'boolean',
    triggerSymptoms: ['fever', 'cough', 'sore_throat', 'headache', 'nausea', 'vomiting', 'diarrhea', 'abdominal_pain', 'fatigue', 'congestion', 'breathing_difficulty', 'other']
  }
]

export function getQuestionById(id: string): QuestionDefinition | undefined {
  return QUESTIONS.find((q) => q.id === id)
}
