import { CURRENT_YEAR } from '@/constants/chart'

/** 월간 레포트 공통 상수/로직 (렌더 무관). 차트 서브컴포넌트는 MonthlyReportCharts.tsx. */

// 월간 레포트는 항상 3개년 비교: 전전년도 · 전년도 · 당해연도(=기준연도)
export const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]

const now = new Date()
// 진행 중인 당월은 검사·수술 등이 아직 누적 중이라 값이 급감 → 마지막 '완료된 월'까지만 표시(당월 포함 이후 null)
export const isIncompleteMonth = (year: number, monthIndex: number) =>
  year > now.getFullYear() || (year === now.getFullYear() && monthIndex >= now.getMonth())

/* 예약률 2024·2025 확정값 (CataractReservationRatePage와 동일) */
export const VISION_RATE_LEGACY: Record<number, number[]> = {
  2024: [77, 79, 77, 76, 78, 80, 76, 80, 79, 75, 72, 74],
  2025: [75, 76, 79, 77, 76, 75, 77, 77, 76, 82, 77, 75],
}
export const CATARACT_RATE_LEGACY: Record<number, number[]> = {
  2024: [64, 69, 66, 80, 62, 65, 66, 67, 63, 74, 57, 77],
  2025: [68, 57, 59, 49, 58, 44, 55, 63, 57, 55, 57, 55],
}

export const mergeMonthlySeries = (
  base: Array<number | null | undefined> | undefined,
  fallback: Array<number | null | undefined> | undefined,
): Array<number | null> =>
  Array.from({ length: 12 }, (_, i) => {
    const baseValue = base?.[i]
    if (typeof baseValue === 'number') return baseValue

    const fallbackValue = fallback?.[i]
    return typeof fallbackValue === 'number' ? fallbackValue : null
  })

export const applyCurrentYearBase = (
  data: Record<number, Array<number | null>>,
  currentYear: number,
  base: Array<number | null | undefined> | undefined,
): Record<number, Array<number | null>> => {
  if (!base) return data
  return {
    ...data,
    [currentYear]: mergeMonthlySeries(base, data[currentYear]),
  }
}

/** overall-exam/weekly 주간 항목을 월별로 합산한 값 (당해연도 라이브 도표용) */
export interface OverallMonthSums {
  introGeneral: number
  introCustomer: number
  introStaff: number
  jobOffice: number
  jobStudent: number
  jobEtc: number
  visionExam: number
  oneDay: number
  visionBooked: number
  oneDayBooked: number
  stopCount: number
}
