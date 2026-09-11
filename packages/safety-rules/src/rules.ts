import type { SafetyRule } from '@checkcare/shared-types'

/**
 * Versioned, source-backed safety rules.
 *
 * CRITICAL: this list is the ONLY thing that determines EMERGENCY/URGENT
 * escalation in CheckCare. It is evaluated deterministically by
 * apps/edge/src/safety/safety-engine.ts and MedPsy can never lower the risk
 * level these rules produce (see docs/safety.md, "Risk precedence").
 *
 * Every rule cites a real source consulted while building this project
 * (NHS.uk clinical pages, retrieved 2026-09-10). Do not add a rule without
 * a source. Do not soften an existing rule without updating RULES_VERSION.
 */
export const RULES_VERSION = '1.0.0'

const NHS_BREATHLESSNESS = 'https://www.nhs.uk/symptoms/shortness-of-breath/'
const NHS_DEHYDRATION = 'https://www.nhs.uk/conditions/dehydration/'
const NHS_FEVER = 'https://www.nhs.uk/conditions/fever-in-adults/'
const NHS_HEADACHES = 'https://www.nhs.uk/symptoms/headaches/'
const NHS_DIARRHOEA_VOMITING = 'https://www.nhs.uk/conditions/diarrhoea-and-vomiting/'
const NHS_CHEST_PAIN = 'https://www.nhs.uk/conditions/chest-pain/'
const NHS_CYANOSIS = 'https://www.nhs.uk/symptoms/blue-skin-or-lips-cyanosis/'

export const RULES: SafetyRule[] = [
  // ===================== EMERGENCY =====================
  {
    id: 'rule-breathing-severe',
    version: '1.0.0',
    description: 'Severe difficulty breathing (gasping, choking, unable to speak in full sentences).',
    descriptionEs: 'Dificultad respiratoria severa (jadeo, ahogo, incapacidad para hablar con frases completas).',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['breathing_difficulty', 'cough', 'fever'],
    matcher: { type: 'answerEquals', questionId: 'q_breathing_severe', equals: true },
    source: 'NHS — Shortness of breath',
    sourceUrl: NHS_BREATHLESSNESS
  },
  {
    id: 'rule-skin-blue-grey',
    version: '1.0.0',
    description: 'Lips, skin, or nail beds turning pale, blue, or grey (cyanosis).',
    descriptionEs: 'Labios, piel o uñas que se ponen pálidos, azulados o grisáceos (cianosis).',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['breathing_difficulty', 'vomiting', 'diarrhea', 'fever'],
    matcher: { type: 'answerEquals', questionId: 'q_skin_blue', equals: true },
    source: 'NHS — Blue or grey skin or lips (cyanosis)',
    sourceUrl: NHS_CYANOSIS
  },
  {
    id: 'rule-chest-pain-cardiac',
    version: '1.0.0',
    description: 'Chest pain/pressure spreading to arm, neck, jaw, back or stomach, or with sweating, sickness, or lightheadedness — possible heart attack.',
    descriptionEs: 'Dolor u opresión en el pecho que se extiende al brazo, cuello, mandíbula, espalda o estómago, o con sudoración, malestar o mareo: posible infarto.',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['breathing_difficulty', 'fatigue', 'nausea'],
    matcher: { type: 'answerEquals', questionId: 'q_chest_pain_cardiac', equals: true },
    source: 'NHS — Chest pain',
    sourceUrl: NHS_CHEST_PAIN
  },
  {
    id: 'rule-confusion',
    version: '1.0.0',
    description: 'New confusion, unusual drowsiness, or difficulty waking.',
    descriptionEs: 'Confusión nueva, somnolencia inusual o dificultad para despertar.',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['fever', 'headache', 'vomiting', 'diarrhea', 'fatigue'],
    matcher: { type: 'answerEquals', questionId: 'q_confusion', equals: true },
    source: 'NHS — Dehydration / Diarrhoea and vomiting',
    sourceUrl: NHS_DEHYDRATION
  },
  {
    id: 'rule-seizure',
    version: '1.0.0',
    description: 'A seizure (fit) has occurred.',
    descriptionEs: 'Ha ocurrido una convulsión.',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['headache', 'fever'],
    matcher: { type: 'answerEquals', questionId: 'q_seizure', equals: true },
    source: 'NHS — Headaches',
    sourceUrl: NHS_HEADACHES
  },
  {
    id: 'rule-thunderclap-headache',
    version: '1.0.0',
    description: 'Headache that started suddenly and is extremely severe.',
    descriptionEs: 'Dolor de cabeza de inicio repentino y extremadamente intenso.',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['headache'],
    matcher: { type: 'answerEquals', questionId: 'q_thunderclap_headache', equals: true },
    source: 'NHS — Headaches',
    sourceUrl: NHS_HEADACHES
  },
  {
    id: 'rule-neuro-deficit',
    version: '1.0.0',
    description: 'Numbness/weakness in face or body, difficulty speaking, loss of balance, or loss of vision.',
    descriptionEs: 'Entumecimiento o debilidad facial o corporal, dificultad para hablar, pérdida de equilibrio o de visión.',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['headache'],
    matcher: { type: 'answerEquals', questionId: 'q_neuro_deficit', equals: true },
    source: 'NHS — Headaches',
    sourceUrl: NHS_HEADACHES
  },
  {
    id: 'rule-stiff-neck-photophobia',
    version: '1.0.0',
    description: 'Stiff neck with sensitivity to bright light, very high fever, or a non-fading rash — possible meningitis.',
    descriptionEs: 'Rigidez de cuello con sensibilidad a la luz, fiebre muy alta o sarpullido que no desaparece: posible meningitis.',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['headache', 'fever'],
    matcher: { type: 'answerEquals', questionId: 'q_stiff_neck_photophobia', equals: true },
    source: 'NHS — Headaches / Diarrhoea and vomiting',
    sourceUrl: NHS_HEADACHES
  },
  {
    id: 'rule-vomit-blood-or-green',
    version: '1.0.0',
    description: 'Blood in vomit (or coffee-ground appearance), or green vomit.',
    descriptionEs: 'Sangre en el vómito (o aspecto de posos de café), o vómito verde.',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['vomiting', 'nausea'],
    matcher: { type: 'answerEquals', questionId: 'q_vomit_blood_or_green', equals: true },
    source: 'NHS — Diarrhoea and vomiting',
    sourceUrl: NHS_DIARRHOEA_VOMITING
  },
  {
    id: 'rule-severe-abdominal-pain',
    version: '1.0.0',
    description: 'Sudden, severe abdominal pain.',
    descriptionEs: 'Dolor abdominal repentino e intenso.',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['abdominal_pain', 'vomiting', 'diarrhea'],
    matcher: { type: 'answerEquals', questionId: 'q_severe_abdominal_pain', equals: true },
    source: 'NHS — Diarrhoea and vomiting',
    sourceUrl: NHS_DIARRHOEA_VOMITING
  },
  {
    id: 'rule-possible-poisoning',
    version: '1.0.0',
    description: 'Possible ingestion of a poisonous or toxic substance.',
    descriptionEs: 'Posible ingestión de una sustancia tóxica o venenosa.',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['vomiting', 'abdominal_pain', 'nausea'],
    matcher: { type: 'answerEquals', questionId: 'q_possible_poisoning', equals: true },
    source: 'NHS — Diarrhoea and vomiting',
    sourceUrl: NHS_DIARRHOEA_VOMITING
  },
  {
    id: 'rule-severe-dehydration',
    version: '1.0.0',
    description: 'Signs of severe dehydration: very little/no urine, cold or blotchy skin.',
    descriptionEs: 'Signos de deshidratación grave: orina muy escasa o nula, piel fría o con manchas.',
    severity: 'EMERGENCY',
    appliesToSymptoms: ['vomiting', 'diarrhea', 'fever', 'fatigue'],
    matcher: { type: 'answerEquals', questionId: 'q_severe_dehydration', equals: true },
    source: 'NHS — Dehydration',
    sourceUrl: NHS_DEHYDRATION
  },

  // ===================== URGENT =====================
  {
    id: 'rule-leg-swelling-breathlessness',
    version: '1.0.0',
    description: 'Breathlessness with pain/swelling in one leg, or heart palpitations.',
    descriptionEs: 'Falta de aire con dolor o hinchazón en una pierna, o palpitaciones.',
    severity: 'URGENT',
    appliesToSymptoms: ['breathing_difficulty'],
    matcher: { type: 'answerEquals', questionId: 'q_leg_swelling', equals: true },
    source: 'NHS — Shortness of breath',
    sourceUrl: NHS_BREATHLESSNESS
  },
  {
    id: 'rule-cough-blood',
    version: '1.0.0',
    description: 'Coughing up blood.',
    descriptionEs: 'Tos con sangre.',
    severity: 'URGENT',
    appliesToSymptoms: ['cough', 'breathing_difficulty'],
    matcher: { type: 'answerEquals', questionId: 'q_cough_blood', equals: true },
    source: 'NHS — Shortness of breath',
    sourceUrl: NHS_BREATHLESSNESS
  },
  {
    id: 'rule-bloody-stool',
    version: '1.0.0',
    description: 'Blood in diarrhea or bleeding from the bottom.',
    descriptionEs: 'Sangre en la diarrea o sangrado rectal.',
    severity: 'URGENT',
    appliesToSymptoms: ['diarrhea'],
    matcher: { type: 'answerEquals', questionId: 'q_bloody_stool', equals: true },
    source: 'NHS — Diarrhoea and vomiting',
    sourceUrl: NHS_DIARRHOEA_VOMITING
  },
  {
    id: 'rule-gi-duration',
    version: '1.0.0',
    description: 'Diarrhea lasting more than 7 days, or vomiting more than 2 days.',
    descriptionEs: 'Diarrea de más de 7 días, o vómito de más de 2 días.',
    severity: 'URGENT',
    appliesToSymptoms: ['diarrhea', 'vomiting'],
    matcher: { type: 'answerEquals', questionId: 'q_gi_duration', equals: true },
    source: 'NHS — Diarrhoea and vomiting',
    sourceUrl: NHS_DIARRHOEA_VOMITING
  },
  {
    id: 'rule-cannot-keep-fluids',
    version: '1.0.0',
    description: 'Unable to keep any fluids down.',
    descriptionEs: 'No puede retener ningún líquido.',
    severity: 'URGENT',
    appliesToSymptoms: ['vomiting', 'diarrhea', 'nausea'],
    matcher: { type: 'answerEquals', questionId: 'q_cannot_keep_fluids', equals: true },
    source: 'NHS — Diarrhoea and vomiting',
    sourceUrl: NHS_DIARRHOEA_VOMITING
  },
  {
    id: 'rule-moderate-dehydration',
    version: '1.0.0',
    description: 'Persistent dizziness on standing, or dark yellow urine — signs of dehydration needing urgent review.',
    descriptionEs: 'Mareo persistente al ponerse de pie, u orina de color amarillo oscuro: signos de deshidratación que requieren evaluación urgente.',
    severity: 'URGENT',
    appliesToSymptoms: ['vomiting', 'diarrhea', 'fever', 'fatigue'],
    matcher: { type: 'answerEquals', questionId: 'q_moderate_dehydration', equals: true },
    source: 'NHS — Dehydration',
    sourceUrl: NHS_DEHYDRATION
  },
  {
    id: 'rule-fever-not-improving',
    version: '1.0.0',
    description: 'Fever treated at home that is not improving or is getting worse.',
    descriptionEs: 'Fiebre tratada en casa que no mejora o empeora.',
    severity: 'URGENT',
    appliesToSymptoms: ['fever'],
    matcher: { type: 'answerEquals', questionId: 'q_fever_not_improving', equals: true },
    source: 'NHS — Fever in adults',
    sourceUrl: NHS_FEVER
  }
]

export function getRulesForSymptom(symptomKey: string): SafetyRule[] {
  return RULES.filter((r) => r.appliesToSymptoms.includes(symptomKey))
}
