/** 이번 달(YYYY-MM) — 매 호출마다 평가해 자정/월 경계 후에도 최신. */
export const currentMonth = (): string => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** 선택 월의 조회 범위. 진행 중인 달은 전일까지, 지난 달은 말일까지. */
export function periodRange(period: string): { from: string; to: string; lastDay: number } {
  const now = new Date()
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const daysInMonth = new Date(year, month, 0).getDate()
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === month
  const lastDay = isCurrent ? Math.max(1, Math.min(daysInMonth, now.getDate() - 1)) : daysInMonth

  return {
    from: `${period}-01`,
    to: `${period}-${String(lastDay).padStart(2, '0')}`,
    lastDay,
  }
}
