/**
 * 예약통계시스템 — 월간 채널별 예약 현황 시드 데이터.
 *
 * 콜(검사 인입콜·TM) / 온라인(홈페이지·네이버) / 채팅(카카오톡) / 취소 채널을 주차(週) 단위로
 * 분해한 회의자료용 종합표. 채널 원천이 CTI·콜센터(MySQL)·네이버·홈페이지로 흩어져 있어
 * MSSQL 단독 라이브 집계가 불가하므로, 우선 2026-03 대표 수치를 시드로 고정해 화면을 구성한다.
 * (퍼센트 값은 원본 산출식이 시점·분모가 달라 일부 100% 초과가 존재 — 원자료를 그대로 표기한다.)
 */

import { toCsv } from '@/utils/csv'
import type { ReservationStatsDailyCounts } from '@/api/reservation/reservationStatsSystem'

/** 채널별 한 주(또는 합계) 행 — 키 순서가 표 컬럼 순서와 일치한다. */
export interface ChannelRow {
  label: string
  totalReservation: number // 총예약

  // 콜 › 검사 인입콜
  inboundCall: number // 인입콜
  answeredCall: number // 응대콜
  answerRate: number // 응대율(%)
  newInquiry: number // 신규예약문의
  newInquiryRate: number // 신규문의 비율(%)
  callReservation: number // 예약수
  reservationVsNewInquiry: number // 신규문의 대비 예약율(%)
  callReservationRate: number // 예약율(%)

  // 콜 › TM
  tmTotalDb: number // 총 DB
  tmValidDb: number // 유효 DB
  tmReservation: number // 예약수
  tmValidDbRate: number // 유효 DB 예약율(%)
  tmReservationRate: number // 예약율(%)
  tmRecounsel: number // 재상담
  tmRecounselRatio: number // 총 DB 중 재상담비율(%)
  tmRecounselValid: number // 재상담 유효수
  tmRecounselReservation: number // 예약수
  tmRecounselRate: number // 예약율(%)

  // 온라인 › 홈페이지
  homeReceived: number // 예약접수
  homeReservation: number // 예약수
  homeReservationRate: number // 예약율(%)

  // 온라인 › 네이버
  naverReceived: number // 예약접수
  naverRejected: number // 예약접수거절(거절문자 발송분) — 유효접수 = 예약접수 − 예약접수거절
  naverValid: number // 유효접수
  naverReservation: number // 예약수
  naverValidRate: number // 유효접수 예약율(%)
  naverReservationRate: number // 예약율(%)

  // 채팅 › 카카오톡
  kakaoInquiry: number // 문의
  kakaoReservation: number // 예약수
  kakaoReservationRate: number // 예약율(%)

  // 취소
  cancelCallNaver: number // 콜·네이버
  cancelHome: number // 홈페이지
  cancelKakao: number // 카톡
}

/** 우측 종합 블록 한 행(내원·부도·취소). */
export interface SummaryRow {
  label: string
  totalReservationCount: number // 총예약건
  visit: number // 내원
  visitRate: number // 내원율(%)
  noShowReservation: number // 예약(부도)
  noShowRate: number // 부도율(%)
  cancel: number // 취소
  cancelRate: number // 취소율(%)
}

export type CellFormat = 'num' | 'pct'
/** 종합 블록 비율은 소수 1자리(pct1). */
export type SummaryFormat = 'num' | 'pct1'

/** 표 본문 컬럼 메타(총예약 이후). label은 헤더 3행에 그대로 노출. */
export interface ColumnMeta {
  key: keyof Omit<ChannelRow, 'label' | 'totalReservation'>
  label: string
  fmt: CellFormat
  /** 비율 강조 컬럼(빨강 글씨). */
  emphasis?: boolean
}

/** 우측 종합(내원·부도·취소) 컬럼 메타. */
export interface SummaryColumnMeta {
  key: keyof Omit<SummaryRow, 'label'>
  label: string
  fmt: SummaryFormat
  emphasis?: boolean
}

export const SUMMARY_COLUMNS: SummaryColumnMeta[] = [
  { key: 'totalReservationCount', label: '총예약건', fmt: 'num' },
  { key: 'visit', label: '내원', fmt: 'num' },
  { key: 'visitRate', label: '내원율', fmt: 'pct1' },
  { key: 'noShowReservation', label: '예약(부도)', fmt: 'num' },
  { key: 'noShowRate', label: '부도율', fmt: 'pct1', emphasis: true },
  { key: 'cancel', label: '취소', fmt: 'num' },
  { key: 'cancelRate', label: '취소율', fmt: 'pct1', emphasis: true },
]

/** 콜(검사 인입콜 8 + TM 10) → 온라인(홈 3 + 네이버 5) → 채팅(카카오 3) → 취소(3) = 32컬럼. */
export const CHANNEL_COLUMNS: ColumnMeta[] = [
  // 콜 › 검사 인입콜
  { key: 'inboundCall', label: '인입콜', fmt: 'num' },
  { key: 'answeredCall', label: '응대콜', fmt: 'num' },
  { key: 'answerRate', label: '응대율', fmt: 'pct', emphasis: true },
  { key: 'newInquiry', label: '신규예약문의', fmt: 'num' },
  { key: 'newInquiryRate', label: '신규문의 비율', fmt: 'pct' },
  { key: 'callReservation', label: '예약수', fmt: 'num' },
  { key: 'reservationVsNewInquiry', label: '신규문의 대비 예약율', fmt: 'pct', emphasis: true },
  { key: 'callReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  // 콜 › TM
  { key: 'tmTotalDb', label: '총 DB', fmt: 'num' },
  { key: 'tmValidDb', label: '유효 DB', fmt: 'num' },
  { key: 'tmReservation', label: '예약수', fmt: 'num' },
  { key: 'tmValidDbRate', label: '유효 DB 예약율', fmt: 'pct', emphasis: true },
  { key: 'tmReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  { key: 'tmRecounsel', label: '재상담', fmt: 'num' },
  { key: 'tmRecounselRatio', label: '총 DB 중 재상담비율', fmt: 'pct', emphasis: true },
  { key: 'tmRecounselValid', label: '재상담 유효수', fmt: 'num' },
  { key: 'tmRecounselReservation', label: '예약수', fmt: 'num' },
  { key: 'tmRecounselRate', label: '예약율', fmt: 'pct', emphasis: true },
  // 온라인 › 홈페이지
  { key: 'homeReceived', label: '예약접수', fmt: 'num' },
  { key: 'homeReservation', label: '예약수', fmt: 'num' },
  { key: 'homeReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  // 온라인 › 네이버
  { key: 'naverReceived', label: '예약접수', fmt: 'num' },
  { key: 'naverRejected', label: '예약접수거절', fmt: 'num' },
  { key: 'naverValid', label: '유효접수', fmt: 'num' },
  { key: 'naverReservation', label: '예약수', fmt: 'num' },
  { key: 'naverValidRate', label: '유효접수 예약율', fmt: 'pct', emphasis: true },
  { key: 'naverReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  // 채팅 › 카카오톡
  { key: 'kakaoInquiry', label: '문의', fmt: 'num' },
  { key: 'kakaoReservation', label: '예약수', fmt: 'num' },
  { key: 'kakaoReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  // 취소
  { key: 'cancelCallNaver', label: '콜·네이버', fmt: 'num' },
  { key: 'cancelHome', label: '홈페이지', fmt: 'num' },
  { key: 'cancelKakao', label: '카톡', fmt: 'num' },
]

/** 취소 컬럼은 헤더에서 2행(중간 그룹 없음)으로 합쳐 렌더하므로 분리 보관. */
export const CANCEL_COLUMN_COUNT = 3
/** 헤더 3행에서 라벨을 렌더할 컬럼(취소 제외). */
export const CHANNEL_COLUMNS_MAIN = CHANNEL_COLUMNS.slice(0, CHANNEL_COLUMNS.length - CANCEL_COLUMN_COUNT)
export const CANCEL_COLUMNS = CHANNEL_COLUMNS.slice(CHANNEL_COLUMNS.length - CANCEL_COLUMN_COUNT)

/** 툴바 기본 선택 월(YYYY-MM). */
export const DEFAULT_PERIOD = '2026-03'
/** '2026-03' → '3월' */
export const monthShortLabel = (period: string) => `${Number(period.slice(5, 7))}월`
/** '2026-03' → '2026년 3월' */
export const monthFullLabel = (period: string) => `${period.slice(0, 4)}년 ${Number(period.slice(5, 7))}월`

export const CHANNEL_ROWS: ChannelRow[] = [
  {
    label: 'TOTAL',
    totalReservation: 1102,
    inboundCall: 1987, answeredCall: 1953, answerRate: 98, newInquiry: 427, newInquiryRate: 22,
    callReservation: 377, reservationVsNewInquiry: 88, callReservationRate: 34,
    tmTotalDb: 452, tmValidDb: 260, tmReservation: 228, tmValidDbRate: 88, tmReservationRate: 21,
    tmRecounsel: 138, tmRecounselRatio: 31, tmRecounselValid: 77, tmRecounselReservation: 9, tmRecounselRate: 1,
    homeReceived: 227, homeReservation: 218, homeReservationRate: 20,
    naverReceived: 353, naverRejected: 54, naverValid: 299, naverReservation: 264, naverValidRate: 88, naverReservationRate: 24,
    kakaoInquiry: 336, kakaoReservation: 6, kakaoReservationRate: 1,
    cancelCallNaver: 197, cancelHome: 55, cancelKakao: 46,
  },
  {
    label: '1주',
    totalReservation: 60,
    inboundCall: 139, answeredCall: 137, answerRate: 99, newInquiry: 26, newInquiryRate: 19,
    callReservation: 20, reservationVsNewInquiry: 77, callReservationRate: 33,
    tmTotalDb: 25, tmValidDb: 13, tmReservation: 8, tmValidDbRate: 62, tmReservationRate: 13,
    tmRecounsel: 12, tmRecounselRatio: 48, tmRecounselValid: 1, tmRecounselReservation: 0, tmRecounselRate: 0,
    homeReceived: 15, homeReservation: 12, homeReservationRate: 20,
    naverReceived: 29, naverRejected: 4, naverValid: 25, naverReservation: 20, naverValidRate: 80, naverReservationRate: 33,
    kakaoInquiry: 27, kakaoReservation: 0, kakaoReservationRate: 0,
    cancelCallNaver: 29, cancelHome: 11, cancelKakao: 4,
  },
  {
    label: '2주',
    totalReservation: 259,
    inboundCall: 432, answeredCall: 422, answerRate: 98, newInquiry: 90, newInquiryRate: 21,
    callReservation: 73, reservationVsNewInquiry: 81, callReservationRate: 28,
    tmTotalDb: 114, tmValidDb: 64, tmReservation: 56, tmValidDbRate: 88, tmReservationRate: 22,
    tmRecounsel: 31, tmRecounselRatio: 27, tmRecounselValid: 15, tmRecounselReservation: 5, tmRecounselRate: 2,
    homeReceived: 57, homeReservation: 54, homeReservationRate: 21,
    naverReceived: 90, naverRejected: 11, naverValid: 79, naverReservation: 69, naverValidRate: 87, naverReservationRate: 27,
    kakaoInquiry: 62, kakaoReservation: 2, kakaoReservationRate: 1,
    cancelCallNaver: 37, cancelHome: 17, cancelKakao: 5,
  },
  {
    label: '3주',
    totalReservation: 248,
    inboundCall: 497, answeredCall: 483, answerRate: 97, newInquiry: 92, newInquiryRate: 19,
    callReservation: 84, reservationVsNewInquiry: 91, callReservationRate: 34,
    tmTotalDb: 106, tmValidDb: 60, tmReservation: 51, tmValidDbRate: 85, tmReservationRate: 129,
    tmRecounsel: 38, tmRecounselRatio: 36, tmRecounselValid: 28, tmRecounselReservation: 2, tmRecounselRate: 1,
    homeReceived: 57, homeReservation: 56, homeReservationRate: 23,
    naverReceived: 79, naverRejected: 17, naverValid: 62, naverReservation: 52, naverValidRate: 580, naverReservationRate: 181,
    kakaoInquiry: 90, kakaoReservation: 1, kakaoReservationRate: 1,
    cancelCallNaver: 34, cancelHome: 9, cancelKakao: 8,
  },
  {
    label: '4주',
    totalReservation: 268,
    inboundCall: 497, answeredCall: 495, answerRate: 100, newInquiry: 115, newInquiryRate: 23,
    callReservation: 107, reservationVsNewInquiry: 93, callReservationRate: 40,
    tmTotalDb: 104, tmValidDb: 62, tmReservation: 59, tmValidDbRate: 95, tmReservationRate: 21,
    tmRecounsel: 36, tmRecounselRatio: 35, tmRecounselValid: 17, tmRecounselReservation: 2, tmRecounselRate: 1,
    homeReceived: 41, homeReservation: 39, homeReservationRate: 15,
    naverReceived: 78, naverRejected: 17, naverValid: 61, naverReservation: 61, naverValidRate: 90, naverReservationRate: 23,
    kakaoInquiry: 107, kakaoReservation: 0, kakaoReservationRate: 0,
    cancelCallNaver: 53, cancelHome: 9, cancelKakao: 20,
  },
  {
    label: '5주',
    totalReservation: 267,
    inboundCall: 422, answeredCall: 416, answerRate: 99, newInquiry: 104, newInquiryRate: 25,
    callReservation: 93, reservationVsNewInquiry: 89, callReservationRate: 35,
    tmTotalDb: 103, tmValidDb: 61, tmReservation: 54, tmValidDbRate: 89, tmReservationRate: 20,
    tmRecounsel: 21, tmRecounselRatio: 20, tmRecounselValid: 16, tmRecounselReservation: 0, tmRecounselRate: 0,
    homeReceived: 57, homeReservation: 57, homeReservationRate: 21,
    naverReceived: 77, naverRejected: 12, naverValid: 65, naverReservation: 62, naverValidRate: 95, naverReservationRate: 23,
    kakaoInquiry: 50, kakaoReservation: 1, kakaoReservationRate: 1,
    cancelCallNaver: 44, cancelHome: 9, cancelKakao: 9,
  },
]

export const SUMMARY_ROWS: SummaryRow[] = [
  { label: 'TOTAL', totalReservationCount: 1242, visit: 870, visitRate: 70.0, noShowReservation: 120, noShowRate: 9.7, cancel: 252, cancelRate: 20.3 },
  { label: '1주', totalReservationCount: 207, visit: 157, visitRate: 75.8, noShowReservation: 10, noShowRate: 4.8, cancel: 40, cancelRate: 19.3 },
  { label: '2주', totalReservationCount: 258, visit: 178, visitRate: 69.0, noShowReservation: 26, noShowRate: 10.1, cancel: 54, cancelRate: 20.9 },
  { label: '3주', totalReservationCount: 251, visit: 177, visitRate: 70.5, noShowReservation: 31, noShowRate: 12.4, cancel: 43, cancelRate: 17.1 },
  { label: '4주', totalReservationCount: 292, visit: 208, visitRate: 71.2, noShowReservation: 22, noShowRate: 7.5, cancel: 62, cancelRate: 21.2 },
  { label: '5주', totalReservationCount: 234, visit: 150, visitRate: 64.1, noShowReservation: 31, noShowRate: 13.2, cancel: 53, cancelRate: 22.6 },
]

/* ──────────────────────────────────────────────────────────────────────────
 * 조회 단위(월/주/일/전체) — 툴바 기본값은 월별.
 * 일별 행은 선택 월의 실제 달력으로 생성(요일·일요일 휴무 자동)하고, 주별 시드를
 * 해당 캘린더 주의 영업일에 분배해 파생한다. 비율 컬럼은 주 비율을 그대로 내린다(시드 표시용).
 * 진행 중인 달(현재 월)은 전일까지만 표시한다(오늘 데이터는 미집계).
 * ────────────────────────────────────────────────────────────────────────── */

export type Granularity = 'month' | 'week' | 'day' | 'all'

export const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: 'month', label: '월별' },
  { key: 'week', label: '주별' },
  { key: 'day', label: '일별' },
  { key: 'all', label: '전체' },
]

/** 행 계층 — 전체 보기에서 월/주/일 구간을 색으로 구분한다. */
export type RowTier = 'month' | 'week' | 'day'

/** 표 한 행에 채널 + 종합을 함께 담는다(두 블록을 한 줄로 병합). */
export interface DisplayRow {
  label: string
  tier: RowTier
  weekday?: string
  isTotal?: boolean
  /** 휴무일(일요일) — 회색 처리. */
  muted?: boolean
  /** 새 주 시작(일별 보기에서 주 구분선). */
  weekStart?: boolean
  channel: ChannelRow
  summary: SummaryRow
}

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

const deriveChannel = (weekly: ChannelRow, openDays: number[], day: number, isSunday: boolean): ChannelRow => {
  const out: ChannelRow = { ...weekly }
  out.totalReservation = isSunday ? 0 : distribute(weekly.totalReservation, openDays, day)
  for (const col of CHANNEL_COLUMNS) {
    out[col.key] = isSunday ? 0 : col.fmt === 'pct' ? weekly[col.key] : distribute(weekly[col.key], openDays, day)
  }
  return out
}

const deriveSummary = (weekly: SummaryRow, openDays: number[], day: number, isSunday: boolean): SummaryRow => {
  const out: SummaryRow = { ...weekly }
  for (const col of SUMMARY_COLUMNS) {
    out[col.key] = isSunday ? 0 : col.fmt === 'pct1' ? weekly[col.key] : distribute(weekly[col.key], openDays, day)
  }
  return out
}

const buildDailyRows = (period: string): DisplayRow[] => {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7)) // 1-based
  const daysInMonth = new Date(year, month, 0).getDate()

  const now = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month
  // 진행 중인 달은 전일까지만(오늘 데이터는 미집계). 지난 달은 말일까지.
  const lastDay = isCurrentMonth ? Math.min(daysInMonth, now.getDate() - 1) : daysInMonth

  const firstWeekday = new Date(year, month - 1, 1).getDay() // 0=일
  const weekOf = (day: number) => Math.floor((day - 1 + firstWeekday) / 7) // 0-based 캘린더 주

  // 표시 범위(1~lastDay)의 캘린더 주별 영업일(일요일 제외) — 분배 분모.
  const openByWeek = new Map<number, number[]>()
  for (let day = 1; day <= lastDay; day++) {
    if (new Date(year, month - 1, day).getDay() === 0) continue
    const w = weekOf(day)
    openByWeek.set(w, [...(openByWeek.get(w) ?? []), day])
  }

  const rows: DisplayRow[] = []
  for (let day = 1; day <= lastDay; day++) {
    const weekdayIdx = new Date(year, month - 1, day).getDay()
    const isSunday = weekdayIdx === 0
    const seedIdx = Math.min(weekOf(day), 4) + 1 // 시드 주 1~5
    const openDays = openByWeek.get(weekOf(day)) ?? []
    rows.push({
      label: `${day}일`,
      tier: 'day',
      weekday: WEEKDAY_KR[weekdayIdx],
      muted: isSunday,
      weekStart: day === 1 || weekdayIdx === 0,
      channel: deriveChannel(CHANNEL_ROWS[seedIdx], openDays, day, isSunday),
      summary: deriveSummary(SUMMARY_ROWS[seedIdx], openDays, day, isSunday),
    })
  }
  return rows
}

const weekDisplayRows = (): DisplayRow[] =>
  CHANNEL_ROWS.map((channel, i) => ({
    label: channel.label,
    tier: i === 0 ? 'month' : 'week',
    isTotal: i === 0,
    channel,
    summary: SUMMARY_ROWS[i],
  }))

/**
 * 조회 단위별 표 행 목록. TOTAL(월 합계)은 주/일 보기에서도 맨 위에 고정 노출.
 *   month — 월 합계 1행 / week — 월 합계 + 주별 / day — 월 합계 + 일별 / all — 월→주→일 누적
 * 일별은 선택 월의 실제 달력으로 생성하며, 진행 중인 달은 전일까지만 표시한다.
 * (수치는 대표 시드값이라 월별로 동일 — 라이브 집계 연동 전.)
 */
export const getDisplayRows = (granularity: Granularity, period: string): DisplayRow[] => {
  const rows = weekDisplayRows()
  const total = rows[0]
  if (granularity === 'month') return [{ ...total, label: monthShortLabel(period) }]
  if (granularity === 'week') return rows
  if (granularity === 'all') return [...rows, ...buildDailyRows(period)]
  return [total, ...buildDailyRows(period)]
}

/* ──────────────────────────────────────────────────────────────────────────
 * 실데이터(BCRM RSS) — 일자별 원시 카운트 → 표시 행 계산.
 * 카운트만 합산(일→주→월)하고 비율·총예약은 운영 쿼리와 동일 공식으로 재계산한다.
 *   D(예약율 분모) = 인입콜+TM총DB+TM재상담+홈예약+네이버예약+카톡예약 (CH01+CH05+CH08+CH12+CH16+CH18)
 *   총예약          = 검사예약+TM예약+TM재상담예약+홈예약+네이버예약+카톡예약 (CH04+CH07+CH10+CH12+CH16+CH18, 인입콜 제외)
 * ────────────────────────────────────────────────────────────────────────── */

type Counts = Omit<ReservationStatsDailyCounts, 'date'>

const COUNT_KEYS: (keyof Counts)[] = [
  'inboundCall', 'answeredCall', 'newInquiry', 'callReservation',
  'tmTotalDb', 'tmValidDb', 'tmReservation', 'tmRecounsel', 'tmRecounselValid', 'tmRecounselReservation',
  'homeReceived', 'homeReservation',
  'naverReceived', 'naverRejected', 'naverValid', 'naverReservation',
  'kakaoInquiry', 'kakaoReservation',
  'cancelCallNaver', 'cancelHome', 'cancelKakao',
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

/** 예약율류 공통 분모(콜 유입 기준). */
const denom = (c: Counts): number =>
  c.inboundCall + c.tmTotalDb + c.tmRecounsel + c.homeReservation + c.naverReservation + c.kakaoReservation

const computeChannelRow = (c: Counts, label: string): ChannelRow => {
  const d = denom(c)
  return {
    label,
    // 총예약 = 각 채널 예약수 합(인입콜 제외) — CH04+CH07+CH10+CH12+CH16+CH18
    totalReservation:
      c.callReservation + c.tmReservation + c.tmRecounselReservation +
      c.homeReservation + c.naverReservation + c.kakaoReservation,
    inboundCall: c.inboundCall,
    answeredCall: c.answeredCall,
    answerRate: pctInt(c.answeredCall, c.inboundCall),
    newInquiry: c.newInquiry,
    newInquiryRate: pctInt(c.newInquiry, c.answeredCall),
    callReservation: c.callReservation,
    reservationVsNewInquiry: pctInt(c.callReservation, c.newInquiry),
    callReservationRate: pctInt(c.callReservation, d),
    tmTotalDb: c.tmTotalDb,
    tmValidDb: c.tmValidDb,
    tmReservation: c.tmReservation,
    tmValidDbRate: pctInt(c.tmReservation, c.tmValidDb),
    tmReservationRate: pctInt(c.tmReservation, d),
    tmRecounsel: c.tmRecounsel,
    tmRecounselRatio: pctInt(c.tmRecounsel, c.tmTotalDb),
    tmRecounselValid: c.tmRecounselValid,
    tmRecounselReservation: c.tmRecounselReservation,
    tmRecounselRate: pctInt(c.tmRecounselReservation, d),
    homeReceived: c.homeReceived,
    homeReservation: c.homeReservation,
    homeReservationRate: pctInt(c.homeReservation, d),
    naverReceived: c.naverReceived,
    naverRejected: c.naverRejected,
    naverValid: c.naverValid,
    naverReservation: c.naverReservation,
    naverValidRate: pctInt(c.naverReservation, c.naverValid),
    naverReservationRate: pctInt(c.naverReservation, d),
    kakaoInquiry: c.kakaoInquiry,
    kakaoReservation: c.kakaoReservation,
    kakaoReservationRate: pctInt(c.kakaoReservation, d),
    cancelCallNaver: c.cancelCallNaver,
    cancelHome: c.cancelHome,
    cancelKakao: c.cancelKakao,
  }
}

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

const countRow = (c: Counts, label: string, tier: RowTier, extra: Partial<DisplayRow> = {}): DisplayRow => ({
  label,
  tier,
  isTotal: tier === 'month',
  channel: computeChannelRow(c, label),
  summary: computeSummaryRow(c, label),
  ...extra,
})

/**
 * 실데이터(일자별 카운트) → 조회 단위별 표시 행.
 * 일별은 선택 월 달력(1~lastDay)으로 채우고, 데이터 없는 날은 0(휴무 회색). 주/월은 카운트 합산 후 비율 재계산.
 */
export const getDisplayRowsFromCounts = (
  granularity: Granularity,
  dailies: ReservationStatsDailyCounts[],
  period: string,
  lastDay: number,
): DisplayRow[] => {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const byDate = new Map<string, Counts>(dailies.map((d) => [d.date, d]))
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const weekOf = (day: number) => Math.floor((day - 1 + firstWeekday) / 7)

  const dayRows: DisplayRow[] = []
  const weekBuckets = new Map<number, Counts[]>()
  const allCounts: Counts[] = []

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${period}-${String(day).padStart(2, '0')}`
    const counts = byDate.get(dateStr) ?? zeroCounts()
    const weekdayIdx = new Date(year, month - 1, day).getDay()
    allCounts.push(counts)
    const w = weekOf(day)
    weekBuckets.set(w, [...(weekBuckets.get(w) ?? []), counts])
    dayRows.push(
      countRow(counts, `${day}일`, 'day', {
        weekday: WEEKDAY_KR[weekdayIdx],
        muted: isZeroCounts(counts),
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

/* ── CSV 직렬화 — 표에 보이는 41컬럼을 그룹 접두사로 평탄화. ── */
const csvGroupPrefix = (index: number): string => {
  if (index <= 7) return '콜>검사 인입콜' // 0-7
  if (index <= 17) return '콜>TM' // 8-17
  if (index <= 20) return '온라인>홈페이지' // 18-20
  if (index <= 26) return '온라인>네이버' // 21-26 (예약접수거절 포함 6컬럼)
  if (index <= 29) return '채팅>카카오톡' // 27-29
  return '취소' // 30-32
}

/** 현재 조회 결과 행을 그대로 CSV 문자열로 직렬화(휴무일은 빈 칸). */
export const buildReservationStatsCsv = (rows: DisplayRow[]): string => {
  const headers = [
    '구분',
    '총예약',
    ...CHANNEL_COLUMNS.map((col, i) => `${csvGroupPrefix(i)}>${col.label}`),
    ...SUMMARY_COLUMNS.map((col) => `종합>${col.label}`),
  ]
  const matrix = rows.map((row) => [
    row.weekday ? `${row.label}(${row.weekday})` : row.label,
    row.muted ? '' : row.channel.totalReservation,
    ...CHANNEL_COLUMNS.map((col) => (row.muted ? '' : row.channel[col.key])),
    ...SUMMARY_COLUMNS.map((col) => (row.muted ? '' : row.summary[col.key])),
  ])
  return toCsv(headers, matrix)
}
