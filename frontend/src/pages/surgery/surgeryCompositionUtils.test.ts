import { describe, expect, it } from 'vitest'

import { EMPTY, buildSurgeryRows, monthRange, type Cell } from './surgeryCompositionUtils'

const cell = (overrides: Partial<Cell> = {}): Cell => ({ ...EMPTY, ...overrides })

// 2026-06: 1일=월요일. firstWeekday(6/1)=1 → 1주=1~6일, 2주=7~13일 …
const PERIOD = '2026-06'
const { lastDay } = monthRange(PERIOD) // 30

const dataMap: Record<string, Cell> = {
  '2026-06-01': cell({ visionPatients: 10, cataractPatients: 2, total: 12 }),
  '2026-06-02': cell({ visionPatients: 5, cataractPatients: 0, total: 5 }),
  '2026-06-08': cell({ visionPatients: 3, cataractPatients: 1, total: 4 }), // 2주차
}

describe('monthRange', () => {
  it('해당 월의 1일~말일과 lastDay를 반환한다', () => {
    expect(monthRange('2026-06')).toEqual({ from: '2026-06-01', to: '2026-06-30', lastDay: 30 })
    expect(monthRange('2026-02').lastDay).toBe(28)
  })
})

describe('buildSurgeryRows', () => {
  it('month: 월 합계 한 행만 반환한다', () => {
    const rows = buildSurgeryRows('month', dataMap, PERIOD, lastDay)
    expect(rows).toHaveLength(1)
    expect(rows[0].tier).toBe('month')
    expect(rows[0].label).toBe('6월')
    expect(rows[0].d.total).toBe(21) // 12 + 5 + 4
    expect(rows[0].d.visionPatients).toBe(18)
  })

  it('week: 월 합계 + 주차별 행, 일 데이터를 주차로 합산한다', () => {
    const rows = buildSurgeryRows('week', dataMap, PERIOD, lastDay)
    expect(rows[0].tier).toBe('month')
    const weekRows = rows.slice(1)
    expect(weekRows.every((r) => r.tier === 'week')).toBe(true)
    // 1주(1~6일) = 12 + 5 = 17, 2주(7~13일) = 4
    expect(weekRows[0].label).toBe('1주')
    expect(weekRows[0].d.total).toBe(17)
    expect(weekRows[1].d.total).toBe(4)
  })

  it('day: 월 합계 + 말일 수만큼 일 행, 데이터 없는 날은 muted', () => {
    const rows = buildSurgeryRows('day', dataMap, PERIOD, lastDay)
    expect(rows).toHaveLength(1 + lastDay)
    const day1 = rows[1]
    expect(day1.tier).toBe('day')
    expect(day1.label).toBe('1일')
    expect(day1.weekday).toBe('월')
    expect(day1.muted).toBeFalsy()
    const day3 = rows[3] // 6/3 데이터 없음
    expect(day3.muted).toBe(true)
  })

  it('all: 월 합계 + 주차 + 일자를 모두 포함한다', () => {
    const rows = buildSurgeryRows('all', dataMap, PERIOD, lastDay)
    const tiers = rows.map((r) => r.tier)
    expect(tiers[0]).toBe('month')
    expect(tiers.filter((t) => t === 'week').length).toBeGreaterThan(0)
    expect(tiers.filter((t) => t === 'day').length).toBe(lastDay)
  })
})
