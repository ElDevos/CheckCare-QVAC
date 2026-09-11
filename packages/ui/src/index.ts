// Shared design tokens re-exported for apps/web. Component implementations
// live in apps/web/components — this package currently exports shared
// constants only, kept separate so risk-level color mapping cannot drift
// between screens.
export const RISK_LEVEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  EMERGENCY: { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B' },
  URGENT: { bg: '#FFF7ED', border: '#EA580C', text: '#9A3412' },
  PROFESSIONAL_EVALUATION: { bg: '#FFFBEB', border: '#D97706', text: '#92400E' },
  MONITOR: { bg: '#F0FDF4', border: '#16A34A', text: '#166534' }
}
