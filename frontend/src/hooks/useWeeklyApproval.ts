import { useCallback, useMemo, useState } from 'react'
import { weekOf, weeksInRange, type WeekRef } from '@/utils/weekBucket'

export interface WeekGroup {
  ref: WeekRef
  count: number
}

/**
 * 리스트 페이지 공용 "주별 승인" 상태·집계 훅 (예약자 리스트와 동일 워크플로우).
 * rows를 getDate(행→YYYY-MM-DD) 기준으로 주차 버킷에 모으고, from~to 구간의 모든 주를 0건까지 열거한다.
 * - 승인(approved)·선택주차(selectedWeek)는 화면 상태(저장X) — 새로고침 시 초기화.
 * - selectedRows = 선택 주차로 거른 행(없으면 전체) → 상세 표/페이지네이션 소스로 사용.
 * ⚠️ weeksInRange는 "같은 달" 가정(주 번호로만 정렬) — 호출부에서 from·to가 동일 월일 때만 패널을 노출할 것.
 */
export function useWeeklyApproval<T>(
  rows: T[],
  getDate: (row: T) => string,
  from: string,
  to: string,
) {
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)

  const weeks = useMemo<WeekGroup[]>(() => {
    const counts = new Map<string, number>()
    for (const row of rows) {
      const date = getDate(row)
      if (!date) continue
      const key = weekOf(date).key
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return weeksInRange(from, to).map((ref) => ({ ref, count: counts.get(ref.key) ?? 0 }))
  }, [rows, getDate, from, to])

  const selectedRows = useMemo(() => {
    if (!selectedWeek) return rows
    return rows.filter((row) => {
      const date = getDate(row)
      return date ? weekOf(date).key === selectedWeek : false
    })
  }, [rows, getDate, selectedWeek])

  const toggleApprove = useCallback((key: string) => {
    setApproved((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectWeek = useCallback((key: string) => {
    setSelectedWeek((prev) => (prev === key ? null : key))
  }, [])

  const clearSelection = useCallback(() => setSelectedWeek(null), [])

  const reset = useCallback(() => {
    setApproved(new Set())
    setSelectedWeek(null)
  }, [])

  return { weeks, approved, selectedWeek, selectedRows, toggleApprove, selectWeek, clearSelection, reset }
}
