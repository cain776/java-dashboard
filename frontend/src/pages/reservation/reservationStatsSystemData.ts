/**
 * 예약통계시스템 — 월간 채널별 예약 현황 집계/표시 로직.
 *
 * 콜(검사 인입콜·TM) / 온라인(홈페이지·네이버) / 채팅(카카오톡) / 취소 채널을 주차(週) 단위로
 * 분해한 회의자료용 종합표. 운영 라이브(getDisplayRowsFromCounts) 또는 확정 스냅샷으로 표시한다.
 * (퍼센트 값은 원본 산출식이 시점·분모가 달라 일부 100% 초과가 존재 — 원자료를 그대로 표기한다.)
 */

import { toCsv } from '@/utils/csv'
import type { ReservationStatsDailyCounts } from '@/api/reservation/reservationStatsSystem'
import {
  createCountHelpers,
  monthShortLabel,
  pct1,
  pctInt,
  weekOf,
  weekdayKo,
  type Granularity,
  type RowTier,
} from './shared/reservationStatsCore'

export { DEFAULT_PERIOD, GRANULARITIES, monthFullLabel, monthShortLabel } from './shared/reservationStatsCore'
export type { Granularity, RowTier } from './shared/reservationStatsCore'

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
  naverReceived: number // 예약접수(RESERVATION 등록일 카운트)
  naverRejected: number // 파트너거절(RESERVATION_NAVER 확정전 취소) — 유효접수 = 예약접수 − 파트너거절
  naverValid: number // 유효접수(접수−거절)
  naverReservation: number // 예약수(유효−사용자취소(네이버취소))
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
  { key: 'naverRejected', label: '파트너거절', fmt: 'num' },
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

const { zeroCounts, sumCounts, isZeroCounts } = createCountHelpers<Counts>(COUNT_KEYS)

/** 예약율류 공통 분모(콜 유입 기준). */
const denom = (c: Counts): number =>
  c.inboundCall + c.tmTotalDb + c.tmRecounsel + c.homeReservation + Math.max(0, c.naverReservation) + c.kakaoReservation

const computeChannelRow = (c: Counts, label: string): ChannelRow => {
  const d = denom(c)
  // 네이버 유효/예약은 일별(접수0인 날 거절만 있는 휴무일)에 음수가 될 수 있어 표시 시 0으로 클램프.
  // 주/월 합계는 원시(음수 포함) 합이 정확하므로, 양수인 합계 행에는 영향이 없다.
  const naverValid = Math.max(0, c.naverValid)
  const naverReservation = Math.max(0, c.naverReservation)
  return {
    label,
    // 총예약 = 각 채널 예약수 합(인입콜 제외) — CH04+CH07+CH10+CH12+CH16+CH18
    totalReservation:
      c.callReservation + c.tmReservation + c.tmRecounselReservation +
      c.homeReservation + naverReservation + c.kakaoReservation,
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
    naverValid,
    naverReservation,
    naverValidRate: pctInt(naverReservation, naverValid),
    naverReservationRate: pctInt(naverReservation, d),
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

  const dayRows: DisplayRow[] = []
  const weekBuckets = new Map<number, Counts[]>()
  const allCounts: Counts[] = []

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${period}-${String(day).padStart(2, '0')}`
    const counts = byDate.get(dateStr) ?? zeroCounts()
    const weekdayIdx = new Date(year, month - 1, day).getDay()
    allCounts.push(counts)
    const w = weekOf(day, firstWeekday)
    weekBuckets.set(w, [...(weekBuckets.get(w) ?? []), counts])
    dayRows.push(
      countRow(counts, `${day}일`, 'day', {
        weekday: weekdayKo(weekdayIdx),
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
