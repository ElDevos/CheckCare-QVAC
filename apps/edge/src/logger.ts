/**
 * Structured logging. Per master prompt section 55, logs must never contain
 * medical/personal content — only operational metadata (durations, counts,
 * status transitions, error codes).
 */
type LogFields = Record<string, string | number | boolean | undefined>

function emit(level: 'info' | 'warn' | 'error', event: string, fields: LogFields = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields
  }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (event: string, fields?: LogFields) => emit('info', event, fields),
  warn: (event: string, fields?: LogFields) => emit('warn', event, fields),
  error: (event: string, fields?: LogFields) => emit('error', event, fields)
}
