# Safety

## What CheckCare can do

- Help a person structure and describe their symptoms.
- Ask a short, deterministic set of adaptive follow-up questions relevant to those symptoms.
- Apply a fixed, source-cited set of red-flag rules to those symptoms and answers.
- Explain, in plain language grounded in cited sources, what the identified risk level generally
  means and what steps are commonly recommended.
- Keep a private, local history and let the user log follow-up status.

## What CheckCare cannot and must not do

- Diagnose a condition ("you have X").
- Prescribe or recommend a specific medication or dose.
- Tell a user they are healthy, fine, or have nothing to worry about.
- Let its language model override a risk level the deterministic Safety Engine determined.
- Send any symptom, prompt, or response to a server outside this device.

## Risk levels

```ts
type RiskLevel = 'EMERGENCY' | 'URGENT' | 'PROFESSIONAL_EVALUATION' | 'MONITOR'
```

There is deliberately no `SAFE` / `HEALTHY` / `NOTHING_SERIOUS` value. Even the lowest tier,
`MONITOR`, is phrased as "no red-flag signs were identified in what you reported — watch for
changes," never as reassurance that nothing is wrong.

| Level | Meaning |
|---|---|
| `EMERGENCY` | Signs that may require immediate attention. |
| `URGENT` | Professional evaluation should be sought as a priority. |
| `PROFESSIONAL_EVALUATION` | The information provided justifies considering a professional evaluation. |
| `MONITOR` | No red-flag signs were identified in the information provided; the user should still watch for changes and seek help if new signs appear. |

## How red flags are defined

`packages/safety-rules/src/rules.ts` holds every rule as a typed, versioned object:

```ts
interface SafetyRule {
  id: string
  version: string
  description: string      // English
  descriptionEs: string    // Spanish (shown in the UI)
  severity: 'EMERGENCY' | 'URGENT'
  appliesToSymptoms: string[]
  matcher: SafetyRuleMatcher   // e.g. { type: 'answerEquals', questionId, equals }
  source: string
  sourceUrl: string
}
```

Every rule cites a real page retrieved from **NHS.uk** (UK National Health Service) on
2026-09-10. No criterion in this codebase was invented. The current rule set (`RULES_VERSION =
"1.0.0"`) covers:

| Source | Topic | Rules derived |
|---|---|---|
| [Shortness of breath](https://www.nhs.uk/symptoms/shortness-of-breath/) | Breathing | Severe difficulty breathing → EMERGENCY; leg swelling/palpitations, coughing blood → URGENT |
| [Blue or grey skin or lips (cyanosis)](https://www.nhs.uk/symptoms/blue-skin-or-lips-cyanosis/) | Breathing | Cyanosis → EMERGENCY |
| [Chest pain](https://www.nhs.uk/conditions/chest-pain/) | Cardiac | Chest pain radiating + sweating/lightheadedness → EMERGENCY |
| [Headaches](https://www.nhs.uk/symptoms/headaches/) | Neurological | Seizure, thunderclap headache, neuro deficit, stiff neck + photophobia → EMERGENCY |
| [Diarrhoea and vomiting](https://www.nhs.uk/conditions/diarrhoea-and-vomiting/) | GI | Blood/coffee-ground or green vomit, severe sudden abdominal pain, possible poisoning → EMERGENCY; bloody stool, >7 days diarrhoea/>2 days vomiting, can't keep fluids down → URGENT |
| [Dehydration](https://www.nhs.uk/conditions/dehydration/) | Dehydration | Signs of severe dehydration (cold/blotchy skin, minimal urination) → EMERGENCY; persistent dizziness on standing, dark urine → URGENT |
| [Fever in adults](https://www.nhs.uk/conditions/fever-in-adults/) | Fever | Fever not improving with home treatment → URGENT |

Additionally, the Safety Engine escalates any case with no triggered rule but a duration of 5+
days to `PROFESSIONAL_EVALUATION` rather than leaving it at `MONITOR` indefinitely, and flags any
free-text mention of possible poisoning regardless of the symptoms selected.

## Risk precedence

**MedPsy can never lower the Safety Engine's risk level.** This isn't a policy enforced by a
prompt instruction alone — it's structural:

```ts
// apps/edge/src/qvac/medpsy.ts
export interface MedPsyOutput {
  summary: string
  warningSigns: string[]
  recommendedNextSteps: string[]
  questionsToMonitor: string[]
  uncertainty: string[]
  // no `riskLevel` field
}
```

`assessment-engine.ts` sets `AssessmentResult.riskLevel` directly from the Safety Engine's output;
MedPsy's return type has nowhere to put a competing value. The Response Validator adds a second,
belt-and-suspenders layer: for `EMERGENCY`/`URGENT` cases, it rejects any MedPsy output that
recommends only home management with no escalation language at all. See
`apps/edge/src/assessment/risk-precedence.test.ts` for the automated test that proves this by
mocking MedPsy to emit deliberately reassuring, MONITOR-sounding text for an EMERGENCY case and
asserting the final result is still `EMERGENCY`.

## Response Validator

Runs deterministically (no LLM) on every MedPsy output before it can reach a user
(`apps/edge/src/assessment/response-validator.ts`):

- **No diagnosis** — rejects "you have X," "you are suffering from X," "this is definitely X,"
  explicit self-diagnosis claims. (Deliberately does *not* flag the safe, deferential use of the
  word "diagnose" itself, e.g. "only a healthcare professional can diagnose you" — an earlier,
  overly broad version of this pattern caused false rejections; see the git history of
  `response-validator.ts` / its test suite for the fix.)
- **No prescription** — rejects medication names/dosages, "take X mg," "stop your medication."
- **No false certainty** — rejects "definitely," "certainly," "you're fine," "nothing to worry
  about."
- **No contradiction** — for `EMERGENCY`/`URGENT` cases, rejects a response with no escalation
  language, or with home-only language and no escalation language.
- **No unverifiable sources** — every source id is checked against `knowledge/manifest.json`;
  anything not present is dropped before the response reaches the user.

If MedPsy's output fails validation twice in a row, the system falls back to a deterministic,
risk-level-appropriate Spanish template (`assessment-engine.ts`'s `buildFallbackOutput`) rather
than showing a rejected or broken response.

## Known limitations, risks, and uncertainty

- **False negatives:** the rule set covers 7 topics; a red flag outside those topics (e.g. an
  isolated symptom not in the catalog) will not be caught by the Safety Engine and could be
  under-escalated to `PROFESSIONAL_EVALUATION` or `MONITOR` based on duration alone.
- **False positives:** the Response Validator's pattern matching is intentionally conservative and
  can reject correct, safe MedPsy output (triggering the deterministic fallback) rather than risk
  showing something unsafe — see `evaluation/reports/` for the measured
  Unsupported-Claim/rejection rate on the current test cases.
- **Not clinically validated:** this rule set was built by reading NHS public patient-guidance
  pages, not by a licensed clinician or a validated triage protocol (e.g. Manchester Triage
  System). It should not be treated as equivalent to one.
- **Self-report only:** all inputs are what the user chooses to report; the system cannot verify
  or examine anything.
