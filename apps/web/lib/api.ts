import type {
  AdaptiveQuestion,
  AssessmentRecord,
  FollowUpInput,
  ModelInfo,
  QuestionAnswer,
  SymptomEntry,
  SymptomInput
} from '@checkcare/shared-types'

/**
 * The web app never talks to QVAC directly (master prompt section 34) —
 * every call goes through the local Edge Runtime over plain localhost HTTP.
 */
const EDGE_BASE_URL = process.env.NEXT_PUBLIC_EDGE_URL ?? 'http://127.0.0.1:4111'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${EDGE_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers }
    })
  } catch {
    throw new ApiError('edge_unreachable', 'No se pudo conectar con el motor local de CheckCare. Asegúrate de que la app esté en ejecución (npm run dev).')
  }

  if (!res.ok) {
    let body: { error?: string; message?: string } = {}
    try {
      body = await res.json()
    } catch {
      // ignore
    }
    throw new ApiError(body.error ?? 'unknown_error', body.message ?? 'Ocurrió un error inesperado.')
  }
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = {
  health: () => request<{ status: string; offline: boolean }>('/health'),
  modelStatus: () => request<ModelInfo>('/api/model/status'),
  startAssessment: (input: SymptomInput) =>
    request<{ questions: AdaptiveQuestion[] }>('/api/assessment/start', { method: 'POST', body: JSON.stringify(input) }),
  questionsFor: (symptoms: SymptomEntry[]) =>
    request<{ questions: AdaptiveQuestion[] }>('/api/assessment/questions', { method: 'POST', body: JSON.stringify({ symptoms }) }),
  evaluate: (symptoms: SymptomInput, answers: QuestionAnswer[]) =>
    request<{ assessment: AssessmentRecord; modelUsed: boolean }>('/api/assessment/evaluate', {
      method: 'POST',
      body: JSON.stringify({ symptoms, answers })
    }),
  getAssessment: (id: string) => request<{ assessment: AssessmentRecord }>(`/api/assessment/${id}`),
  history: (limit = 50) => request<{ items: AssessmentRecord[] }>(`/api/history?limit=${limit}`),
  followUp: (input: FollowUpInput) =>
    request<{ assessment: AssessmentRecord; modelUsed: boolean }>('/api/follow-up', { method: 'POST', body: JSON.stringify(input) })
}
