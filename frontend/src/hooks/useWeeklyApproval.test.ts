// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { weekOf } from '@/utils/weekBucket'
import { useWeeklyApproval } from './useWeeklyApproval'

interface Row {
  date: string
}
const getDate = (row: Row) => row.date

const FROM = '2026-06-01'
const TO = '2026-06-30'
const rows: Row[] = [{ date: '2026-06-01' }, { date: '2026-06-02' }, { date: '2026-06-15' }]

const setup = () => renderHook(() => useWeeklyApproval(rows, getDate, FROM, TO))

describe('useWeeklyApproval', () => {
  it('구간의 모든 주를 열거하고 주차별 행 수를 집계한다', () => {
    const { result } = setup()

    expect(result.current.weeks.length).toBeGreaterThan(0)
    const total = result.current.weeks.reduce((sum, w) => sum + w.count, 0)
    expect(total).toBe(rows.length)
  })

  it('초기에는 선택 주차가 없고 selectedRows는 전체 행이다', () => {
    const { result } = setup()

    expect(result.current.selectedWeek).toBeNull()
    expect(result.current.selectedRows).toHaveLength(rows.length)
  })

  it('주 선택 시 해당 주 행만 거르고, 같은 주 재선택 시 해제한다', () => {
    const { result } = setup()
    const targetKey = weekOf('2026-06-01').key
    const expected = rows.filter((row) => weekOf(row.date).key === targetKey).length

    act(() => result.current.selectWeek(targetKey))
    expect(result.current.selectedWeek).toBe(targetKey)
    expect(result.current.selectedRows).toHaveLength(expected)

    act(() => result.current.selectWeek(targetKey))
    expect(result.current.selectedWeek).toBeNull()
    expect(result.current.selectedRows).toHaveLength(rows.length)
  })

  it('toggleApprove는 승인 키를 추가/제거한다', () => {
    const { result } = setup()
    const key = result.current.weeks[0].ref.key

    act(() => result.current.toggleApprove(key))
    expect(result.current.approved.has(key)).toBe(true)

    act(() => result.current.toggleApprove(key))
    expect(result.current.approved.has(key)).toBe(false)
  })

  it('reset은 승인·선택 상태를 모두 초기화한다', () => {
    const { result } = setup()
    const key = result.current.weeks[0].ref.key

    act(() => {
      result.current.toggleApprove(key)
      result.current.selectWeek(key)
    })
    expect(result.current.approved.size).toBe(1)
    expect(result.current.selectedWeek).not.toBeNull()

    act(() => result.current.reset())
    expect(result.current.approved.size).toBe(0)
    expect(result.current.selectedWeek).toBeNull()
  })
})
