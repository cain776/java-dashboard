import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import type { CataractStatsDailyCounts } from '@/api/reservation/reservationStatsCataract'
import type { ReservationStatsDailyCounts } from '@/api/reservation/reservationStatsSystem'
import {
  buildCataractStatsCsv,
  CATARACT_COLUMNS,
  getDisplayRowsFromCounts as getCataractDisplayRowsFromCounts,
  type CataractDisplayRow,
} from './reservationStatsCataractData'
import {
  buildReservationStatsCsv,
  CHANNEL_COLUMNS,
  getDisplayRowsFromCounts as getSystemDisplayRowsFromCounts,
  SUMMARY_COLUMNS,
  type DisplayRow,
  type Granularity,
} from './reservationStatsSystemData'

type LockedSnapshot<TDaily> = {
  period: string
  locked: boolean
  days: TDaily[]
}

const LOCKED_PERIODS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'] as const
const GRANULARITIES: Granularity[] = ['month', 'week', 'day', 'all']
const CSV_GRANULARITIES: Granularity[] = ['month', 'all']

const SYSTEM_CHANNEL_KEYS = [
  'totalReservation',
  ...CHANNEL_COLUMNS.map((column) => column.key),
] satisfies Array<keyof DisplayRow['channel']>
const SYSTEM_SUMMARY_KEYS = SUMMARY_COLUMNS.map((column) => column.key) satisfies Array<keyof DisplayRow['summary']>

const CATARACT_CHANNEL_KEYS = CATARACT_COLUMNS.map((column) => column.key) satisfies Array<
  keyof CataractDisplayRow['channel']
>
const CATARACT_SUMMARY_KEYS = SUMMARY_COLUMNS.map((column) => column.key) satisfies Array<
  keyof CataractDisplayRow['summary']
>

const readLockedSnapshot = <TDaily>(
  directory: 'reservation-stats' | 'reservation-stats-cataract',
  period: (typeof LOCKED_PERIODS)[number],
): LockedSnapshot<TDaily> => {
  const fixtureUrl = new URL(`../../../../backend/data/${directory}/${period}.json`, import.meta.url)
  const snapshot = JSON.parse(readFileSync(fixtureUrl, 'utf8')) as LockedSnapshot<TDaily>

  expect(snapshot.period).toBe(period)
  expect(snapshot.locked).toBe(true)

  return snapshot
}

const lastDayOfMonth = (period: string): number => {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  return new Date(year, month, 0).getDate()
}

const rowMeta = (row: Pick<DisplayRow, 'label' | 'tier' | 'weekday' | 'isTotal' | 'muted' | 'weekStart'>) => ({
  label: row.label,
  tier: row.tier,
  weekday: row.weekday ?? null,
  isTotal: row.isTotal ?? false,
  muted: row.muted ?? false,
  weekStart: row.weekStart ?? false,
})

const compactSystemRows = (rows: DisplayRow[]) => ({
  columns: {
    channel: SYSTEM_CHANNEL_KEYS,
    summary: SYSTEM_SUMMARY_KEYS,
  },
  rows: rows.map((row) => ({
    ...rowMeta(row),
    channel: SYSTEM_CHANNEL_KEYS.map((key) => row.channel[key]),
    summary: SYSTEM_SUMMARY_KEYS.map((key) => row.summary[key]),
  })),
})

const compactCataractRows = (rows: CataractDisplayRow[]) => ({
  columns: {
    channel: CATARACT_CHANNEL_KEYS,
    summary: CATARACT_SUMMARY_KEYS,
  },
  rows: rows.map((row) => ({
    ...rowMeta(row),
    channel: CATARACT_CHANNEL_KEYS.map((key) => row.channel[key]),
    summary: CATARACT_SUMMARY_KEYS.map((key) => row.summary[key]),
  })),
})

describe('reservation stats locked golden master', () => {
  it('uses only locked 2026-01 through 2026-05 snapshots', () => {
    expect([...LOCKED_PERIODS]).toEqual(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'])
    expect(LOCKED_PERIODS).not.toContain('2026-06')
  })

  describe('시력교정 예약통계', () => {
    for (const period of LOCKED_PERIODS) {
      it(`${period} locked JSON -> display rows`, () => {
        const snapshot = readLockedSnapshot<ReservationStatsDailyCounts>('reservation-stats', period)
        const lastDay = lastDayOfMonth(period)
        const displayRows = Object.fromEntries(
          GRANULARITIES.map((granularity) => [
            granularity,
            compactSystemRows(getSystemDisplayRowsFromCounts(granularity, snapshot.days, period, lastDay)),
          ]),
        )

        expect({
          input: { period, locked: snapshot.locked, rawDayCount: snapshot.days.length, lastDay },
          displayRows,
        }).toMatchSnapshot()
      })

      it(`${period} locked JSON -> CSV`, () => {
        const snapshot = readLockedSnapshot<ReservationStatsDailyCounts>('reservation-stats', period)
        const lastDay = lastDayOfMonth(period)
        const csvRows = Object.fromEntries(
          CSV_GRANULARITIES.map((granularity) => [
            granularity,
            buildReservationStatsCsv(
              getSystemDisplayRowsFromCounts(granularity, snapshot.days, period, lastDay),
            ).split('\r\n'),
          ]),
        )

        expect({
          input: { period, locked: snapshot.locked, rawDayCount: snapshot.days.length, lastDay },
          csvRows,
        }).toMatchSnapshot()
      })
    }
  })

  describe('백내장 예약통계', () => {
    for (const period of LOCKED_PERIODS) {
      it(`${period} locked JSON -> display rows`, () => {
        const snapshot = readLockedSnapshot<CataractStatsDailyCounts>('reservation-stats-cataract', period)
        const lastDay = lastDayOfMonth(period)
        const displayRows = Object.fromEntries(
          GRANULARITIES.map((granularity) => [
            granularity,
            compactCataractRows(getCataractDisplayRowsFromCounts(granularity, snapshot.days, period, lastDay)),
          ]),
        )

        expect({
          input: { period, locked: snapshot.locked, rawDayCount: snapshot.days.length, lastDay },
          displayRows,
        }).toMatchSnapshot()
      })

      it(`${period} locked JSON -> CSV`, () => {
        const snapshot = readLockedSnapshot<CataractStatsDailyCounts>('reservation-stats-cataract', period)
        const lastDay = lastDayOfMonth(period)
        const csvRows = Object.fromEntries(
          CSV_GRANULARITIES.map((granularity) => [
            granularity,
            buildCataractStatsCsv(
              getCataractDisplayRowsFromCounts(granularity, snapshot.days, period, lastDay),
            ).split('\r\n'),
          ]),
        )

        expect({
          input: { period, locked: snapshot.locked, rawDayCount: snapshot.days.length, lastDay },
          csvRows,
        }).toMatchSnapshot()
      })
    }
  })
})
