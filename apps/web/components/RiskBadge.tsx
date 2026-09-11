import type { RiskLevel } from '@checkcare/shared-types'

const LABELS: Record<RiskLevel, string> = {
  EMERGENCY: 'Emergencia',
  URGENT: 'Urgente',
  PROFESSIONAL_EVALUATION: 'Evaluación profesional',
  MONITOR: 'Vigilar'
}

const STYLES: Record<RiskLevel, { bg: string; border: string; text: string }> = {
  EMERGENCY: { bg: 'var(--risk-emergency-bg)', border: 'var(--risk-emergency-border)', text: 'var(--risk-emergency-text)' },
  URGENT: { bg: 'var(--risk-urgent-bg)', border: 'var(--risk-urgent-border)', text: 'var(--risk-urgent-text)' },
  PROFESSIONAL_EVALUATION: { bg: 'var(--risk-professional-bg)', border: 'var(--risk-professional-border)', text: 'var(--risk-professional-text)' },
  MONITOR: { bg: 'var(--risk-monitor-bg)', border: 'var(--risk-monitor-border)', text: 'var(--risk-monitor-text)' }
}

export function riskLevelLabel(level: RiskLevel): string {
  return LABELS[level]
}

export function RiskBadge({ level, size = 'md' }: { level: RiskLevel; size?: 'sm' | 'md' }) {
  const s = STYLES[level]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: size === 'sm' ? '3px 10px' : '6px 14px',
        borderRadius: 999,
        border: `1.5px solid ${s.border}`,
        background: s.bg,
        color: s.text,
        fontWeight: 700,
        fontSize: size === 'sm' ? 12 : 14,
        letterSpacing: '0.02em'
      }}
    >
      {LABELS[level]}
    </span>
  )
}

export function RiskPanel({ level, children }: { level: RiskLevel; children: React.ReactNode }) {
  const s = STYLES[level]
  return (
    <div className="risk-panel" style={{ background: s.bg, borderColor: s.border, color: s.text }}>
      {children}
    </div>
  )
}
