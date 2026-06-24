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

export type ReservationStatsDiffItem = z.infer<typeof reservationStatsDiffItemSchema>
export type ReservationStatsDiff = z.infer<typeof reservationStatsDiffSchema>

const formatNullable = (value: number | null): string | number => value ?? ''

export const buildReservationStatsDiffCsv = (diff: ReservationStatsDiff): string =>
  toCsv(
    ['기간', '스냅샷여부', '라이브 시작', '라이브 종료', '일자', '필드', '스냅샷', '라이브', '차이'],
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
    ]),
  )
