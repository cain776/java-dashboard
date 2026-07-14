/**
 * 외래 예약통계 — 채널별(콜·어플·현장(CRM)·카카오톡상담·부도) 외래 예약 현황 집계/표시 로직.
 *
 * 예약통계_시력교정(reservation-stats-system)과 동일한 가로 스크롤 종합표 UI를 재사용하되,
 * 컬럼 구성(콜13/어플4/현장4/카톡5/부도3)과 산출식만 외래용으로 교체했다.
 * ⚠️ 현재는 실데이터 미연결 — 화면/포맷 검증용 목업(deterministic) 카운트로 렌더한다.
 *    실제 소스(EICN 인입/응대콜·RESERVE_PATH 채널 등) 연동 시 getMockDailyCounts를 교체하면 된다.
 */

import {
  createCountHelpers,
  pctInt,
  type Granularity,
  type RowTier,
} from '../reservation/shared/reservationStatsCore'
import type { CellFormat } from '../reservation/shared/reservationStatsFormat'
import { buildDisplayRowsFromCounts, type StatsDisplayRow } from '../reservation/shared/reservationStatsRows'
import { computeSummaryRow } from '../reservation/shared/reservationStatsSummary'
import { buildStatsCsv, type CsvColumnGroup } from '../reservation/shared/reservationStatsCsv'

export { DEFAULT_PERIOD, GRANULARITIES, monthFullLabel, monthShortLabel } from '../reservation/shared/reservationStatsCore'
export type { Granularity, RowTier } from '../reservation/shared/reservationStatsCore'

/** 일자별 원시 카운트(비율 제외) — 일→주→월 합산 대상. */
export interface OutpatientStatsCounts {
  // 콜
  inboundCall: number // 총 인입콜
  answeredCall: number // 총 응대콜
  inquiryOnly: number // 문의만
  reservationChange: number // 예약 변경
  callReservation: number // 예약
  callCancel: number // 취소
  // 어플
  appReservation: number // 예약
  appCancel: number // 취소
  // 현장(CRM)
  crmReservation: number // 예약
  crmCancel: number // 취소
  // 카카오톡상담
  kakaoAll: number // 모든상담
  kakaoReservation: number // 예약
  kakaoCancel: number // 취소
  // 부도
  noShowCti: number // CTI
  noShowApp: number // 어플
  noShowCrm: number // 현장(CRM)
}

export type OutpatientStatsDaily = OutpatientStatsCounts & { date: string }

/** 채널별 한 행(주/월/일) — 키 순서가 표 컬럼 순서와 일치한다. */
export interface ChannelRow {
  label: string
  totalReservation: number // 총예약 = 콜+어플+현장+카톡 예약수 합

  // 콜
  inboundCall: number
  answeredCall: number
  answerRate: number // 응대율(%)
  scheduleTotal: number // 일정관련 총 응대건수 = 문의만+예약변경+예약
  inquiryOnly: number
  inquiryRate: number // 문의율(%)
  reservationChange: number
  reservationChangeRate: number // 예약변경 문의율(%)
  callReservation: number
  callReservationRate: number // 예약율(%)
  scheduleVsAnsweredRate: number // 전체콜(응대) 대비 일정관련 비율(%)
  callCancel: number
  callCancelRate: number // 취소율(%)

  // 어플
  appReservation: number
  appReservationRate: number // 예약율(%)
  appCancel: number
  appCancelRate: number // 취소율(%)

  // 현장(CRM)
  crmReservation: number
  crmReservationRate: number // 예약율(%)
  crmCancel: number
  crmCancelRate: number // 취소율(%)

  // 카카오톡상담
  kakaoAll: number
  kakaoReservation: number
  kakaoReservationRate: number // 예약율(%)
  kakaoCancel: number
  kakaoCancelRate: number // 취소율(%)

  // 부도
  noShowCti: number
  noShowApp: number
  noShowCrm: number
}

/** 표 본문 컬럼 메타(총예약 이후). label은 헤더 하단 행에 그대로 노출. */
export interface ColumnMeta {
  key: keyof Omit<ChannelRow, 'label' | 'totalReservation'>
  label: string
  fmt: CellFormat
  /** 비율 강조 컬럼(빨강 글씨). */
  emphasis?: boolean
}

/** 콜(13) → 어플(4) → 현장(4) → 카톡(5) → 부도(3) = 29컬럼. */
export const CHANNEL_COLUMNS: ColumnMeta[] = [
  // 콜
  { key: 'inboundCall', label: '총 인입콜', fmt: 'num' },
  { key: 'answeredCall', label: '응대콜', fmt: 'num' },
  { key: 'answerRate', label: '응대율', fmt: 'pct', emphasis: true },
  { key: 'scheduleTotal', label: '일정관련 총 응대건수', fmt: 'num' },
  { key: 'inquiryOnly', label: '문의만', fmt: 'num' },
  { key: 'inquiryRate', label: '문의율', fmt: 'pct' },
  { key: 'reservationChange', label: '예약 변경', fmt: 'num' },
  { key: 'reservationChangeRate', label: '예약변경 문의율', fmt: 'pct' },
  { key: 'callReservation', label: '예약', fmt: 'num' },
  { key: 'callReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  { key: 'scheduleVsAnsweredRate', label: '전체콜 대비 일정관련 비율', fmt: 'pct', emphasis: true },
  { key: 'callCancel', label: '취소', fmt: 'num' },
  { key: 'callCancelRate', label: '취소율', fmt: 'pct', emphasis: true },
  // 어플
  { key: 'appReservation', label: '예약', fmt: 'num' },
  { key: 'appReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  { key: 'appCancel', label: '취소', fmt: 'num' },
  { key: 'appCancelRate', label: '취소율', fmt: 'pct', emphasis: true },
  // 현장(CRM)
  { key: 'crmReservation', label: '예약', fmt: 'num' },
  { key: 'crmReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  { key: 'crmCancel', label: '취소', fmt: 'num' },
  { key: 'crmCancelRate', label: '취소율', fmt: 'pct', emphasis: true },
  // 카카오톡상담
  { key: 'kakaoAll', label: '모든상담', fmt: 'num' },
  { key: 'kakaoReservation', label: '예약', fmt: 'num' },
  { key: 'kakaoReservationRate', label: '예약율', fmt: 'pct', emphasis: true },
  { key: 'kakaoCancel', label: '취소', fmt: 'num' },
  { key: 'kakaoCancelRate', label: '취소율', fmt: 'pct', emphasis: true },
  // 부도
  { key: 'noShowCti', label: 'CTI', fmt: 'num' },
  { key: 'noShowApp', label: '어플', fmt: 'num' },
  { key: 'noShowCrm', label: '현장(CRM)', fmt: 'num' },
]

/** 헤더 최상위 그룹 경계(컬럼 인덱스) — 콜13 / 어플4 / 현장4 / 카톡5 / 부도3. */
export const GROUP_SPANS = [13, 4, 4, 5, 3] as const

/** 표 한 행. 시력교정 페이지와 동일 타입(SummaryRow는 미사용이나 형식 호환용으로 채운다). */
export type OutpatientDisplayRow = StatsDisplayRow<ChannelRow>

/** 채널별 원시 카운트 → 비율 포함 표시 행 계산. */
export const computeChannelRow = (c: OutpatientStatsCounts, label: string): ChannelRow => {
  const totalReservation = c.callReservation + c.appReservation + c.crmReservation + c.kakaoReservation
  const scheduleTotal = c.inquiryOnly + c.reservationChange + c.callReservation
  return {
    label,
    totalReservation,
    inboundCall: c.inboundCall,
    answeredCall: c.answeredCall,
    answerRate: pctInt(c.answeredCall, c.inboundCall),
    scheduleTotal,
    inquiryOnly: c.inquiryOnly,
    inquiryRate: pctInt(c.inquiryOnly, scheduleTotal),
    reservationChange: c.reservationChange,
    reservationChangeRate: pctInt(c.reservationChange, scheduleTotal),
    callReservation: c.callReservation,
    callReservationRate: pctInt(c.callReservation, scheduleTotal),
    scheduleVsAnsweredRate: pctInt(scheduleTotal, c.answeredCall),
    callCancel: c.callCancel,
    callCancelRate: pctInt(c.callCancel, scheduleTotal),
    appReservation: c.appReservation,
    appReservationRate: pctInt(c.appReservation, totalReservation),
    appCancel: c.appCancel,
    appCancelRate: pctInt(c.appCancel, c.appReservation),
    crmReservation: c.crmReservation,
    crmReservationRate: pctInt(c.crmReservation, totalReservation),
    crmCancel: c.crmCancel,
    crmCancelRate: pctInt(c.crmCancel, c.crmReservation),
    kakaoAll: c.kakaoAll,
    kakaoReservation: c.kakaoReservation,
    kakaoReservationRate: pctInt(c.kakaoReservation, totalReservation),
    kakaoCancel: c.kakaoCancel,
    kakaoCancelRate: pctInt(c.kakaoCancel, c.kakaoAll),
    noShowCti: c.noShowCti,
    noShowApp: c.noShowApp,
    noShowCrm: c.noShowCrm,
  }
}

const COUNT_KEYS: (keyof OutpatientStatsCounts)[] = [
  'inboundCall', 'answeredCall', 'inquiryOnly', 'reservationChange', 'callReservation', 'callCancel',
  'appReservation', 'appCancel',
  'crmReservation', 'crmCancel',
  'kakaoAll', 'kakaoReservation', 'kakaoCancel',
  'noShowCti', 'noShowApp', 'noShowCrm',
]

const { zeroCounts, sumCounts, isZeroCounts } = createCountHelpers<OutpatientStatsCounts>(COUNT_KEYS)

const buildRow = (
  c: OutpatientStatsCounts,
  label: string,
  tier: RowTier,
  extra: Partial<OutpatientDisplayRow> = {},
): OutpatientDisplayRow => ({
  label,
  tier,
  isTotal: tier === 'month',
  channel: computeChannelRow(c, label),
  // 우측 종합(내원·부도·취소) 블록은 외래 표에 없으나, 공용 행 타입 호환을 위해 0으로 채운다(미표시).
  summary: computeSummaryRow({ visit: 0, noShowReservation: 0, cancel: 0 }, label),
  ...extra,
})

/**
 * 일자별 카운트 → 조회 단위(월/주/일/전체)별 표시 행.
 * 카운트만 합산하고 비율은 합산 후 재계산 — 공용 버킷팅(buildDisplayRowsFromCounts) 재사용.
 */
export const getOutpatientDisplayRows = (
  granularity: Granularity,
  dailies: OutpatientStatsDaily[],
  period: string,
  lastDay: number,
): OutpatientDisplayRow[] =>
  buildDisplayRowsFromCounts(granularity, dailies, period, lastDay, {
    zeroCounts,
    sumCounts,
    isZeroCounts,
    buildRow,
  })

const OUTPATIENT_CSV_COLUMN_GROUPS: CsvColumnGroup<ColumnMeta>[] = [
  { label: '콜', columns: CHANNEL_COLUMNS.slice(0, 13) },
  { label: '어플', columns: CHANNEL_COLUMNS.slice(13, 17) },
  { label: '현장(CRM)', columns: CHANNEL_COLUMNS.slice(17, 21) },
  { label: '카카오톡상담', columns: CHANNEL_COLUMNS.slice(21, 26) },
  { label: '부도', columns: CHANNEL_COLUMNS.slice(26, 29) },
]

/** 현재 조회 결과 행을 CSV 문자열로 직렬화(휴무일은 빈 칸). */
export const buildOutpatientStatsCsv = (rows: OutpatientDisplayRow[]): string =>
  buildStatsCsv(rows, {
    leading: { header: '총예약', value: (row) => row.channel.totalReservation },
    columnGroups: OUTPATIENT_CSV_COLUMN_GROUPS,
    summaryColumns: [],
  })
