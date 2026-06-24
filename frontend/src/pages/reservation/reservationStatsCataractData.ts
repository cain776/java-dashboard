/**
 * 예약통계_백내장 — 월간 채널별 예약 현황 시드/집계 로직.
 *
 * 백내장(노안 포함) 검사예약을 인바운드(컨택센터)·아웃바운드(TM)·채팅(카카오톡)·온라인·취소
 * 채널로 분해한 회의자료용 종합표. 시력교정(reservationStatsSystemData)과 동일한 운영 방식이되
 * 채널 구성이 달라 별도 스키마를 둔다.
 *
 * 데이터는 2026-04 대표 시드(이미지 기준). 일별 행은 주별 카운트를 영업일에 분배해 파생한다.
 * 비율·합계·총예약건은 카운트 합산 후 동일 공식으로 재계산한다(라이브/스냅샷 연동 시에도 동일).
 */

import { toCsv } from '@/utils/csv'
import type { CataractStatsDailyCounts } from '@/api/reservation/reservationStatsCataract'
import {
  SUMMARY_COLUMNS,
  monthShortLabel,
  type SummaryRow,
  type CellFormat,
  type Granularity,
  type RowTier,
} from './reservationStatsSystemData'

export { SUMMARY_COLUMNS, monthShortLabel, monthFullLabel, GRANULARITIES, DEFAULT_PERIOD } from './reservationStatsSystemData'
export type { SummaryRow, SummaryFormat, CellFormat, Granularity, RowTier } from './reservationStatsSystemData'

/** 채널별 한 행(채널 블록 — 종합 제외). 키 순서가 표 컬럼 순서와 일치한다. */
export interface CataractChannelRow {
  label: string
  // 총 예약(아웃바운드 포함)
  totalCataract: number // 백내장
  totalPresbyopia: number // 노안
  totalSum: number // 합계(= 백내장 + 노안)
  // 인바운드(컨택센터)
  inboundCall: number // 총 인입콜
  answeredCall: number // 응대콜
  answerRate: number // 응대율(%)
  newExamInquiry: number // 총 신규검사문의
  newReInquiry: number // 신규 재문의
  reInquiryRate: number // 재문의 비율(%)
  newPatient: number // ★신환
  inboundReservationRate: number // 예약율(%) = 신환/신규검사문의
  // 아웃바운드(TM)
  tmTotalDb: number // 총 DB
  tmValidDb: number // 유효 DB
  tmReservation: number // 예약수
  tmTotalDbRate: number // 총 DB 예약율(%)
  tmValidDbRate: number // 유효 DB 예약율(%)
  tmOutboundReservation: number // 아웃바운드 총 예약수(= TM 예약수)
  // 채팅(카카오톡)
  kakaoTotalInquiry: number // 총문의(모든)
  kakaoCataractReservation: number // 백내장 검사예약
  kakaoPresbyopiaReservation: number // 노안 검사예약
  // 온라인예약
  onlineReservation: number // 예약수
  onlineNoShow: number // 부도수
  // 취소
  cancelOnline: number // 온라인
  cancelCrm: number // 컨택센터 현장(CRM)
  cancelKakao: number // 카톡
}

/** 표 본문 컬럼 메타(25컬럼). emphasis는 빨강 강조. */
export interface CataractColumnMeta {
  key: keyof Omit<CataractChannelRow, 'label'>
  label: string
  fmt: CellFormat
  emphasis?: boolean
}

/** 총예약(3) → 인바운드(8) → 아웃바운드(6) → 채팅(3) → 온라인예약(2) → 취소(3) = 25컬럼. */
export const CATARACT_COLUMNS: CataractColumnMeta[] = [
  // 총 예약(아웃바운드 포함)
  { key: 'totalCataract', label: '백내장', fmt: 'num' },
  { key: 'totalPresbyopia', label: '노안', fmt: 'num' },
  { key: 'totalSum', label: '합계', fmt: 'num' },
  // 인바운드(컨택센터)
  { key: 'inboundCall', label: '총 인입콜', fmt: 'num' },
  { key: 'answeredCall', label: '응대콜', fmt: 'num' },
  { key: 'answerRate', label: '응대율', fmt: 'pct', emphasis: true },
  { key: 'newExamInquiry', label: '총 신규검사문의', fmt: 'num' },
  { key: 'newReInquiry', label: '신규 재문의', fmt: 'num' },
  { key: 'reInquiryRate', label: '재문의 비율', fmt: 'pct', emphasis: true },
  { key: 'newPatient', label: '★신환', fmt: 'num' },
  { key: 'inboundReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  // 아웃바운드(TM)
  { key: 'tmTotalDb', label: '총 DB', fmt: 'num' },
  { key: 'tmValidDb', label: '유효 DB', fmt: 'num' },
  { key: 'tmReservation', label: '예약수', fmt: 'num' },
  { key: 'tmTotalDbRate', label: '총 DB 예약율', fmt: 'pct', emphasis: true },
  { key: 'tmValidDbRate', label: '유효 DB 예약율', fmt: 'pct', emphasis: true },
  { key: 'tmOutboundReservation', label: '아웃바운드 총 예약수', fmt: 'num', emphasis: true },
  // 채팅(카카오톡)
  { key: 'kakaoTotalInquiry', label: '총문의(모든)', fmt: 'num' },
  { key: 'kakaoCataractReservation', label: '백내장 검사예약', fmt: 'num', emphasis: true },
  { key: 'kakaoPresbyopiaReservation', label: '노안 검사예약', fmt: 'num' },
  // 온라인예약
  { key: 'onlineReservation', label: '예약수', fmt: 'num' },
  { key: 'onlineNoShow', label: '부도수', fmt: 'num' },
  // 취소
  { key: 'cancelOnline', label: '온라인', fmt: 'num' },
  { key: 'cancelCrm', label: '컨택센터 현장(CRM)', fmt: 'num' },
  { key: 'cancelKakao', label: '카톡', fmt: 'num' },
]

/** 헤더 그룹(최상위) — colSpan으로 렌더. */
export const CATARACT_TOP_GROUPS: { label: string; span: number; tone: string }[] = [
  { label: '총 예약(아웃바운드 포함)', span: 3, tone: 'bg-sky-100' },
  { label: '인바운드(컨택센터)', span: 8, tone: 'bg-amber-100' },
  { label: '아웃바운드(TM)', span: 6, tone: 'bg-amber-100' },
  { label: '채팅(카카오톡)', span: 3, tone: 'bg-sky-100' },
  { label: '온라인예약', span: 2, tone: 'bg-emerald-100' },
  { label: '취소', span: 3, tone: 'bg-slate-100' },
]

/** 표 한 행 — 채널 + 종합. */
export interface CataractDisplayRow {
  label: string
  tier: RowTier
  weekday?: string
  isTotal?: boolean
  muted?: boolean
  weekStart?: boolean
  channel: CataractChannelRow
  summary: SummaryRow
}

/* ── 카운트 집계/비율 재계산 ── */

type Counts = Omit<CataractStatsDailyCounts, 'date'>

const COUNT_KEYS: (keyof Counts)[] = [
  'totalCataract', 'totalPresbyopia',
  'inboundCall', 'answeredCall', 'newExamInquiry', 'newReInquiry', 'newPatient',
  'tmTotalDb', 'tmValidDb', 'tmReservation',
  'kakaoTotalInquiry', 'kakaoCataractReservation', 'kakaoPresbyopiaReservation',
  'onlineReservation', 'onlineNoShow',
  'cancelOnline', 'cancelCrm', 'cancelKakao',
  'visit', 'noShowReservation', 'cancel',
]

const zeroCounts = (): Counts => Object.fromEntries(COUNT_KEYS.map((k) => [k, 0])) as Counts

const sumCounts = (rows: Counts[]): Counts => {
  const acc = zeroCounts()
  for (const r of rows) for (const k of COUNT_KEYS) acc[k] += r[k]
  return acc
}

const isZeroCounts = (c: Counts): boolean => COUNT_KEYS.every((k) => c[k] === 0)

const pctInt = (a: number, b: number): number => (b === 0 ? 0 : Math.round((a * 100) / b))
const pct1 = (a: number, b: number): number => (b === 0 ? 0 : Math.round((a * 1000) / b) / 10)

// 백내장 총예약 = ★신환 + TM 예약수 + 카톡 백내장 검사예약 + 온라인 예약수 (채널 예약 합)
const cataractTotal = (c: Counts): number =>
  c.newPatient + c.tmReservation + c.kakaoCataractReservation + c.onlineReservation

const computeChannelRow = (c: Counts, label: string): CataractChannelRow => ({
  label,
  totalCataract: cataractTotal(c),
  totalPresbyopia: c.totalPresbyopia,
  totalSum: cataractTotal(c) + c.totalPresbyopia,
  inboundCall: c.inboundCall,
  answeredCall: c.answeredCall,
  answerRate: pctInt(c.answeredCall, c.inboundCall),
  newExamInquiry: c.newExamInquiry,
  newReInquiry: c.newReInquiry,
  reInquiryRate: pctInt(c.newReInquiry, c.newExamInquiry),
  newPatient: c.newPatient,
  inboundReservationRate: pctInt(c.newPatient, c.newExamInquiry),
  tmTotalDb: c.tmTotalDb,
  tmValidDb: c.tmValidDb,
  tmReservation: c.tmReservation,
  tmTotalDbRate: pctInt(c.tmReservation, c.tmTotalDb),
  tmValidDbRate: pctInt(c.tmReservation, c.tmValidDb),
  tmOutboundReservation: c.tmReservation,
  kakaoTotalInquiry: c.kakaoTotalInquiry,
  kakaoCataractReservation: c.kakaoCataractReservation,
  kakaoPresbyopiaReservation: c.kakaoPresbyopiaReservation,
  onlineReservation: c.onlineReservation,
  onlineNoShow: c.onlineNoShow,
  cancelOnline: c.cancelOnline,
  cancelCrm: c.cancelCrm,
  cancelKakao: c.cancelKakao,
})

const computeSummaryRow = (c: Counts, label: string): SummaryRow => {
  const t = c.visit + c.noShowReservation + c.cancel
  return {
    label,
    totalReservationCount: t,
    visit: c.visit,
    visitRate: pct1(c.visit, t),
    noShowReservation: c.noShowReservation,
    noShowRate: pct1(c.noShowReservation, t),
    cancel: c.cancel,
    cancelRate: pct1(c.cancel, t),
  }
}

/* ── 2026-04 시드: 주별(1주~5주) 원시 카운트. 합계는 주 합산으로 도출. ── */

const counts = (v: number[]): Counts => Object.fromEntries(COUNT_KEYS.map((k, i) => [k, v[i]])) as Counts

// 컬럼 순서 = COUNT_KEYS 순서.
const SEED_WEEKLY: Counts[] = [
  // 1주
  counts([17, 0, 108, 106, 15, 0, 12, 24, 5, 3, 4, 1, 0, 1, 1, 0, 3, 0, 6, 1, 2]),
  // 2주
  counts([39, 0, 208, 204, 43, 1, 33, 27, 9, 6, 5, 0, 0, 0, 1, 0, 10, 1, 24, 0, 10]),
  // 3주
  counts([30, 0, 239, 238, 34, 0, 24, 26, 8, 2, 4, 2, 0, 2, 3, 0, 20, 0, 35, 4, 17]),
  // 4주
  counts([29, 0, 222, 221, 26, 0, 22, 30, 6, 6, 9, 1, 0, 0, 0, 0, 12, 1, 25, 1, 11]),
  // 5주
  counts([21, 0, 178, 175, 18, 0, 16, 23, 10, 5, 8, 0, 0, 0, 3, 0, 11, 1, 15, 3, 8]),
]

/* ── 조회 단위(월/주/일/전체) 표 행 생성 ── */

const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토']

const distribute = (total: number, openDays: number[], day: number): number => {
  const n = openDays.length
  if (n === 0) return 0
  const base = Math.floor(total / n)
  const remainder = total - base * n
  const pos = openDays.indexOf(day)
  if (pos < 0) return 0
  return base + (pos < remainder ? 1 : 0)
}

const distributeCounts = (weekly: Counts, openDays: number[], day: number, isSunday: boolean): Counts => {
  const out = zeroCounts()
  if (isSunday) return out
  for (const k of COUNT_KEYS) out[k] = distribute(weekly[k], openDays, day)
  return out
}

const countRow = (c: Counts, label: string, tier: RowTier, extra: Partial<CataractDisplayRow> = {}): CataractDisplayRow => ({
  label,
  tier,
  isTotal: tier === 'month',
  channel: computeChannelRow(c, label),
  summary: computeSummaryRow(c, label),
  ...extra,
})

const buildSeedDailyRows = (period: string): CataractDisplayRow[] => {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const daysInMonth = new Date(year, month, 0).getDate()

  const now = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month
  const lastDay = isCurrentMonth ? Math.max(1, Math.min(daysInMonth, now.getDate() - 1)) : daysInMonth

  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const weekOf = (day: number) => Math.floor((day - 1 + firstWeekday) / 7)

  const openByWeek = new Map<number, number[]>()
  for (let day = 1; day <= lastDay; day++) {
    if (new Date(year, month - 1, day).getDay() === 0) continue
    const w = weekOf(day)
    openByWeek.set(w, [...(openByWeek.get(w) ?? []), day])
  }

  const rows: CataractDisplayRow[] = []
  for (let day = 1; day <= lastDay; day++) {
    const weekdayIdx = new Date(year, month - 1, day).getDay()
    const isSunday = weekdayIdx === 0
    const seedIdx = Math.min(weekOf(day), SEED_WEEKLY.length - 1)
    const openDays = openByWeek.get(weekOf(day)) ?? []
    const c = distributeCounts(SEED_WEEKLY[seedIdx], openDays, day, isSunday)
    rows.push(
      countRow(c, `${day}일`, 'day', {
        weekday: WEEKDAY_KR[weekdayIdx],
        muted: isSunday,
        weekStart: day === 1 || weekdayIdx === 0,
      }),
    )
  }
  return rows
}

const seedWeekRows = (): CataractDisplayRow[] => [
  countRow(sumCounts(SEED_WEEKLY), 'TOTAL', 'month'),
  ...SEED_WEEKLY.map((c, i) => countRow(c, `${i + 1}주`, 'week')),
]

/**
 * 시드(미연결) 조회 단위별 표 행. 수치는 2026-04 대표 시드라 월별로 동일하다(라이브/스냅샷 연동 전).
 */
export const getDisplayRows = (granularity: Granularity, period: string): CataractDisplayRow[] => {
  const rows = seedWeekRows()
  const total = rows[0]
  if (granularity === 'month') return [{ ...total, label: monthShortLabel(period) }]
  if (granularity === 'week') return rows
  if (granularity === 'all') return [...rows, ...buildSeedDailyRows(period)]
  return [total, ...buildSeedDailyRows(period)]
}

/**
 * 실데이터(일자별 카운트) → 조회 단위별 표시 행. 카운트만 합산(일→주→월)하고 비율은 재계산.
 */
export const getDisplayRowsFromCounts = (
  granularity: Granularity,
  dailies: CataractStatsDailyCounts[],
  period: string,
  lastDay: number,
): CataractDisplayRow[] => {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const byDate = new Map<string, Counts>(dailies.map((d) => [d.date, d]))
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const weekOf = (day: number) => Math.floor((day - 1 + firstWeekday) / 7)

  const dayRows: CataractDisplayRow[] = []
  const weekBuckets = new Map<number, Counts[]>()
  const allCounts: Counts[] = []

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${period}-${String(day).padStart(2, '0')}`
    const c = byDate.get(dateStr) ?? zeroCounts()
    const weekdayIdx = new Date(year, month - 1, day).getDay()
    allCounts.push(c)
    const w = weekOf(day)
    weekBuckets.set(w, [...(weekBuckets.get(w) ?? []), c])
    dayRows.push(
      countRow(c, `${day}일`, 'day', {
        weekday: WEEKDAY_KR[weekdayIdx],
        muted: isZeroCounts(c),
        weekStart: day === 1 || weekdayIdx === 0,
      }),
    )
  }

  const totalRow = countRow(sumCounts(allCounts), granularity === 'month' ? monthShortLabel(period) : 'TOTAL', 'month')
  if (granularity === 'month') return [totalRow]

  const weekRows = [...weekBuckets.keys()]
    .sort((a, b) => a - b)
    .map((w) => countRow(sumCounts(weekBuckets.get(w) ?? []), `${w + 1}주`, 'week'))

  if (granularity === 'week') return [totalRow, ...weekRows]
  if (granularity === 'all') return [totalRow, ...weekRows, ...dayRows]
  return [totalRow, ...dayRows]
}

/* ── CSV 직렬화 ── */
const csvGroupPrefix = (index: number): string => {
  if (index <= 2) return '총예약'
  if (index <= 10) return '인바운드(컨택센터)'
  if (index <= 16) return '아웃바운드(TM)'
  if (index <= 19) return '채팅(카카오톡)'
  if (index <= 21) return '온라인예약'
  return '취소'
}

export const buildCataractStatsCsv = (rows: CataractDisplayRow[]): string => {
  const headers = [
    '구분',
    ...CATARACT_COLUMNS.map((col, i) => `${csvGroupPrefix(i)}>${col.label}`),
    ...SUMMARY_COLUMNS.map((col) => `종합>${col.label}`),
  ]
  const matrix = rows.map((row) => [
    row.weekday ? `${row.label}(${row.weekday})` : row.label,
    ...CATARACT_COLUMNS.map((col) => (row.muted ? '' : row.channel[col.key])),
    ...SUMMARY_COLUMNS.map((col) => (row.muted ? '' : row.summary[col.key])),
  ])
  return toCsv(headers, matrix)
}
