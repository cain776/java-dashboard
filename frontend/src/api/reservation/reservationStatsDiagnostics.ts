import { z } from 'zod'
import { toCsv } from '@/utils/csv'

export const reservationStatsDiffItemSchema = z.object({
  date: z.string(),
  field: z.string(),
  snapshotValue: z.number().nullable(),
  liveValue: z.number().nullable(),
  delta: z.number().nullable(),
})

export const reservationStatsDiffSchema = z.object({
  period: z.string(),
  snapshotExists: z.boolean(),
  liveFrom: z.string().nullable(),
  liveTo: z.string().nullable(),
  diffCount: z.number(),
  diffs: z.array(reservationStatsDiffItemSchema),
})

export const reservationStatsDrillDownRowSchema = z.object({
  date: z.string(),
  field: z.string(),
  source: z.string(),
  gb: z.string(),
  gb2: z.string(),
  primaryKey: z.string().nullable(),
  contribution: z.number(),
})

export const reservationStatsDrillDownSchema = z.object({
  period: z.string(),
  date: z.string(),
  field: z.string(),
  snapshotExists: z.boolean(),
  snapshotValue: z.number().nullable(),
  liveValue: z.number().nullable(),
  delta: z.number().nullable(),
  rowCount: z.number(),
  rows: z.array(reservationStatsDrillDownRowSchema),
})

export type ReservationStatsDiffItem = z.infer<typeof reservationStatsDiffItemSchema>
export type ReservationStatsDiff = z.infer<typeof reservationStatsDiffSchema>
export type ReservationStatsDrillDownRow = z.infer<typeof reservationStatsDrillDownRowSchema>
export type ReservationStatsDrillDown = z.infer<typeof reservationStatsDrillDownSchema>

type DrillDownPathBuilder = (item: ReservationStatsDiffItem) => string

const formatNullable = (value: number | null): string | number => value ?? ''

export const buildReservationStatsDiffCsv = (
  diff: ReservationStatsDiff,
  drillDownPathFor?: DrillDownPathBuilder,
): string =>
  toCsv(
    [
      '기간',
      '스냅샷여부',
      '라이브 시작',
      '라이브 종료',
      '일자',
      '필드',
      '스냅샷',
      '라이브',
      '차이',
      '상세조회',
    ],
    diff.diffs.map((item) => [
      diff.period,
      diff.snapshotExists ? 'Y' : 'N',
      diff.liveFrom ?? '',
      diff.liveTo ?? '',
      item.date,
      item.field,
      formatNullable(item.snapshotValue),
      formatNullable(item.liveValue),
      formatNullable(item.delta),
      drillDownPathFor?.(item) ?? '',
    ]),
  )

export const buildReservationStatsDrillDownCsv = (drillDown: ReservationStatsDrillDown): string =>
  toCsv(
    ['기간', '일자', '필드', '스냅샷여부', '스냅샷', '라이브', '차이', 'source', 'GB', 'GB2', 'PK', '기여도'],
    drillDown.rows.map((row) => [
      drillDown.period,
      drillDown.date,
      drillDown.field,
      drillDown.snapshotExists ? 'Y' : 'N',
      formatNullable(drillDown.snapshotValue),
      formatNullable(drillDown.liveValue),
      formatNullable(drillDown.delta),
      row.source,
      row.gb,
      row.gb2,
      row.primaryKey ?? '',
      row.contribution,
    ]),
  )
