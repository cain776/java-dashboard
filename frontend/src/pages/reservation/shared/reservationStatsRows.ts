import {
  monthShortLabel,
  weekOf,
  weekdayKo,
  type Granularity,
  type RowTier,
} from './reservationStatsCore'
import type { SummaryRow } from './reservationStatsSummary'

export interface StatsDisplayRow<TChannel, TSummary = SummaryRow> {
  label: string
  tier: RowTier
  date?: string // 일(day) 행만 채움: yyyy-MM-dd (셀 손보정 대상 식별용)
  weekday?: string
  isTotal?: boolean
  muted?: boolean
  weekStart?: boolean
  channel: TChannel
  summary: TSummary
}

type BuildRow<TCounts, TRow> = (
  counts: TCounts,
  label: string,
  tier: RowTier,
  extra?: Partial<TRow>,
) => TRow

interface BuildDisplayRowsDeps<TCounts, TRow> {
  zeroCounts: () => TCounts
  sumCounts: (rows: readonly TCounts[]) => TCounts
  isZeroCounts: (counts: TCounts) => boolean
  buildRow: BuildRow<TCounts, TRow>
}

/**
 * 일자별 원시 카운트를 조회 단위별 표시 행으로 변환한다.
 * 도메인별 공식은 buildRow 안에 주입하고, 월/주/일 버킷팅만 공유한다.
 */
export function buildDisplayRowsFromCounts<
  TDaily extends { date: string },
  TCounts extends object,
  TRow extends StatsDisplayRow<unknown>,
>(
  granularity: Granularity,
  dailies: readonly TDaily[],
  period: string,
  lastDay: number,
  deps: BuildDisplayRowsDeps<TCounts, TRow>,
): TRow[] {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const byDate = new Map<string, TCounts>(dailies.map((daily) => [daily.date, daily as unknown as TCounts]))
  const firstWeekday = new Date(year, month - 1, 1).getDay()

  const dayRows: TRow[] = []
  const weekBuckets = new Map<number, TCounts[]>()
  const allCounts: TCounts[] = []

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${period}-${String(day).padStart(2, '0')}`
    const counts = byDate.get(dateStr) ?? deps.zeroCounts()
    const weekdayIdx = new Date(year, month - 1, day).getDay()
    allCounts.push(counts)

    const week = weekOf(day, firstWeekday)
    weekBuckets.set(week, [...(weekBuckets.get(week) ?? []), counts])
    dayRows.push(
      deps.buildRow(counts, `${day}일`, 'day', {
        date: dateStr,
        weekday: weekdayKo(weekdayIdx),
        muted: deps.isZeroCounts(counts),
        weekStart: day === 1 || weekdayIdx === 0,
      } as Partial<TRow>),
    )
  }

  const totalRow = deps.buildRow(
    deps.sumCounts(allCounts),
    granularity === 'month' ? monthShortLabel(period) : 'TOTAL',
    'month',
  )
  if (granularity === 'month') return [totalRow]

  const weekRows = [...weekBuckets.keys()]
    .sort((a, b) => a - b)
    .map((week) => deps.buildRow(deps.sumCounts(weekBuckets.get(week) ?? []), `${week + 1}주`, 'week'))

  if (granularity === 'week') return [totalRow, ...weekRows]
  if (granularity === 'all') return [totalRow, ...weekRows, ...dayRows]
  return [totalRow, ...dayRows]
}
