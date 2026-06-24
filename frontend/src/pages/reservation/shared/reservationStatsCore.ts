/** Shared pure helpers for reservation stats data modules. */

export type Granularity = 'month' | 'week' | 'day' | 'all'

export const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: 'month', label: '월별' },
  { key: 'week', label: '주별' },
  { key: 'day', label: '일별' },
  { key: 'all', label: '전체' },
]

/** 행 계층 — 전체 보기에서 월/주/일 구간을 색으로 구분한다. */
export type RowTier = 'month' | 'week' | 'day'

/** 툴바 기본 선택 월(YYYY-MM) — 당월(현재 월). */
export const DEFAULT_PERIOD = (() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})()

/** '2026-03' -> '3월' */
export const monthShortLabel = (period: string) => `${Number(period.slice(5, 7))}월`

/** '2026-03' -> '2026년 3월' */
export const monthFullLabel = (period: string) => `${period.slice(0, 4)}년 ${Number(period.slice(5, 7))}월`

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']

export const weekdayKo = (weekdayIndex: number): string => WEEKDAY_KO[weekdayIndex] ?? ''

/** 0-based calendar week within a month. */
export const weekOf = (day: number, firstWeekday: number): number => Math.floor((day - 1 + firstWeekday) / 7)

export const distribute = (total: number, openDays: number[], day: number): number => {
  const n = openDays.length
  if (n === 0) return 0
  const base = Math.floor(total / n)
  const remainder = total - base * n
  const pos = openDays.indexOf(day)
  if (pos < 0) return 0
  return base + (pos < remainder ? 1 : 0)
}

export const pctInt = (a: number, b: number): number => (b === 0 ? 0 : Math.round((a * 100) / b))

export const pct1 = (a: number, b: number): number => (b === 0 ? 0 : Math.round((a * 1000) / b) / 10)
