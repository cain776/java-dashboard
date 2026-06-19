/**
 * 주차 버킷 — 리스트 페이지 "주별 승인" 패널에서 날짜를 "그 달의 주차"에 귀속한다.
 *
 * 규칙(월 경계 분할):
 *  - 주는 월요일~일요일. 1일이 속한 주 = 1주, 이후 월요일마다 +1.
 *  - 월 경계를 걸치는 주는 경계에서 잘라 각 달의 날짜만 집계 → **월 합계 = 그 달 주 합계**(마감 불변식).
 *  - 중간 주는 항상 7일. **첫 주·마지막 주만** 부분 주(partial)가 될 수 있다(앞쪽 잔여일을 흡수하지 않음).
 *  - 경계 부분주는 같은 '월~일 실주'의 이웃 달 구간을 spillPrevMonth/spillNextMonth로 노출(어디로 집계됐는지 표기용).
 *
 * 예) 8월(8/1=토): 1주* 8/1~8/2(2일, 7/27~31은 7월) · 2~5주 7일 · 6주* 8/31(1일, 9/1~6은 9월).
 */
export interface SpillRange {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}

export interface WeekRef {
  key: string // "2026-05-2"
  year: number
  month: number // 1-12
  week: number // 1+
  startDate: string // YYYY-MM-DD (월 경계 클립)
  endDate: string // YYYY-MM-DD (월 경계 클립)
  days: number // 그 달에 속한 일수 (1~7)
  partial: boolean // 월 경계로 7일 미만이 된 주 (첫 주 또는 마지막 주)
  spillPrevMonth?: SpillRange // 1주의 앞부분이 넘어간 전월 구간
  spillNextMonth?: SpillRange // 마지막 주의 뒷부분이 넘어간 익월 구간
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 1-based 월·오버플로 일자를 ISO로 — 음수/말일초과 일은 이웃 달로 자동 보정된다. */
const isoOf = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)

export function weekOf(isoDate: string): WeekRef {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number)

  // 그 달 1일의 요일 (월=0 ~ 일=6) → 첫 일요일의 '일'(1~7)
  const dow1 = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7
  const firstSunday = 7 - dow1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  // 주차: 1일이 속한 주 = 1주. 이후 월요일마다 +1 (앞쪽 잔여일 흡수 안 함).
  const week = day <= firstSunday ? 1 : 2 + Math.floor((day - firstSunday - 1) / 7)

  // 월 경계로 클립한 그 주의 시작/끝 '일'
  const startDay = week === 1 ? 1 : firstSunday + 1 + (week - 2) * 7
  const endDayFull = week === 1 ? firstSunday : startDay + 6
  const endDay = Math.min(endDayFull, lastDay)
  const days = endDay - startDay + 1

  const ref: WeekRef = {
    key: `${year}-${pad(month)}-${week}`,
    year,
    month,
    week,
    startDate: isoOf(year, month, startDay),
    endDate: isoOf(year, month, endDay),
    days,
    partial: days < 7,
  }

  // 같은 '월~일 실주'가 이웃 달로 넘어간 구간 — 경계 부분주에만 채움
  if (week === 1 && dow1 > 0) {
    ref.spillPrevMonth = { startDate: isoOf(year, month, 1 - dow1), endDate: isoOf(year, month, 0) }
  }
  if (endDayFull > lastDay) {
    ref.spillNextMonth = { startDate: isoOf(year, month, lastDay + 1), endDate: isoOf(year, month, endDayFull) }
  }

  return ref
}

/** "YYYY-MM-DD" → "M/D" 짧은 표기 */
export const shortDate = (iso: string) => {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${m}/${d}`
}

/** 경계 부분주의 "이웃 달로 집계된 구간" 안내 문구. 예: "7/27~31은 7월". 없으면 null. */
export function weekSpillNote(ref: WeekRef): string | null {
  const spill = ref.spillPrevMonth ?? ref.spillNextMonth
  if (!spill) return null
  const [, sm, sd] = spill.startDate.slice(0, 10).split('-').map(Number)
  const [, , ed] = spill.endDate.slice(0, 10).split('-').map(Number)
  return `${sm}/${sd}~${ed}은 ${sm}월`
}

/**
 * from~to(같은 달 내) 날짜 범위에 걸친 모든 주차를 데이터와 무관하게 열거한다.
 * 데이터가 없는 주도 표시(건수 0)하기 위함.
 */
export function weeksInRange(from: string, to: string): WeekRef[] {
  const map = new Map<string, WeekRef>()
  const end = new Date(`${to}T00:00:00Z`)
  for (let d = new Date(`${from}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const ref = weekOf(d.toISOString().slice(0, 10))
    if (!map.has(ref.key)) map.set(ref.key, ref)
  }
  return [...map.values()].sort((a, b) => a.week - b.week)
}
