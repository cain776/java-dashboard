import { describe, expect, it } from 'vitest'
import {
  buildReservationStatsDiffCsv,
  buildReservationStatsDrillDownCsv,
  type ReservationStatsDiff,
  type ReservationStatsDrillDown,
} from './reservationStatsDiagnostics'

describe('reservation stats diagnostics csv', () => {
  it('diff CSV에 상세조회 경로를 포함한다', () => {
    const diff: ReservationStatsDiff = {
      period: '2026-06',
      snapshotExists: true,
      liveFrom: '2026-06-01',
      liveTo: '2026-06-23',
      diffCount: 1,
      diffs: [
        {
          date: '2026-06-22',
          field: 'visit',
          snapshotValue: 32,
          liveValue: 33,
          delta: 1,
        },
      ],
    }

    const csv = buildReservationStatsDiffCsv(
      diff,
      (item) => `/api/stats/reservation-stats-system/diagnostics/drill-down?date=${item.date}&field=${item.field}`,
    )

    expect(csv.split('\r\n')).toEqual([
      '기간,스냅샷여부,라이브 시작,라이브 종료,일자,필드,스냅샷,라이브,차이,상세조회',
      '2026-06,Y,2026-06-01,2026-06-23,2026-06-22,visit,32,33,1,/api/stats/reservation-stats-system/diagnostics/drill-down?date=2026-06-22&field=visit',
    ])
  })

  it('drill-down CSV는 원천 row와 기여도를 보존한다', () => {
    const drillDown: ReservationStatsDrillDown = {
      period: '2026-06',
      date: '2026-06-22',
      field: 'visit',
      snapshotExists: true,
      snapshotValue: 32,
      liveValue: 33,
      delta: 1,
      rowCount: 1,
      rows: [
        {
          date: '2026-06-22',
          field: 'visit',
          source: 'CH_09',
          gb: '내원',
          gb2: '',
          primaryKey: 'RSV-1',
          contribution: 1,
        },
      ],
    }

    expect(buildReservationStatsDrillDownCsv(drillDown).split('\r\n')).toEqual([
      '기간,일자,필드,스냅샷여부,스냅샷,라이브,차이,source,GB,GB2,PK,기여도',
      '2026-06,2026-06-22,visit,Y,32,33,1,CH_09,내원,,RSV-1,1',
    ])
  })
})
