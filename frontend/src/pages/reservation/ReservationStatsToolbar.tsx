import { RotateCcw, Search, Download, DownloadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/filters/Select'
import { GRANULARITIES, type Granularity } from './reservationStatsSystemData'

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}월` }))
const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * 예약통계시스템 전용 툴바 — 월 선택(초안) + 조회 단위(즉시) + 초기화 / 조회 / CSV.
 * 월은 초안(draft)이라 [조회]를 눌러야 적용되고, 조회 단위는 즉시 반영된다(예약자 리스트 패턴과 동일).
 */
interface Props {
  draftMonth: string
  onDraftMonthChange: (month: string) => void
  maxMonth: string
  granularity: Granularity
  onGranularityChange: (g: Granularity) => void
  onSearch: () => void
  onReset: () => void
  onDownloadCsv: () => void
  canDownload: boolean
  /** 호출(증분 채움) — 선택 월을 D-1까지 비어있는 날짜만 적재(있으면 보존). 라이브 소스가 있는 화면만 제공(미제공 시 버튼 숨김). */
  onFill?: () => void
  isFilling?: boolean
  canFill?: boolean
}

export function ReservationStatsToolbar({
  draftMonth,
  onDraftMonthChange,
  maxMonth,
  granularity,
  onGranularityChange,
  onSearch,
  onReset,
  onDownloadCsv,
  canDownload,
  onFill,
  isFilling,
  canFill,
}: Props) {
  const year = Number(draftMonth.slice(0, 4))
  const month = Number(draftMonth.slice(5, 7))
  const currentYear = Number(maxMonth.slice(0, 4))
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear].map((y) => ({ value: y, label: `${y}년` }))

  const setYear = (y: number) => onDraftMonthChange(`${y}-${pad2(month)}`)
  const setMonth = (m: number) => onDraftMonthChange(`${year}-${pad2(m)}`)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-2 py-1.5 text-xs shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">기준 월</span>
        <Select value={year} onChange={setYear} title="년 선택" options={yearOptions} />
        <Select value={month} onChange={setMonth} title="월 선택" options={MONTH_OPTIONS} />
      </div>

      <div className="flex h-8 gap-1 rounded-md bg-gray-100 p-1">
        {GRANULARITIES.map((g) => (
          <button
            key={g.key}
            type="button"
            aria-pressed={granularity === g.key}
            onClick={() => onGranularityChange(g.key)}
            className={`rounded px-3 text-sm font-medium transition-colors ${
              granularity === g.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          초기화
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-blue-600 text-xs text-white hover:bg-blue-700"
          onClick={onSearch}
        >
          <Search className="h-3.5 w-3.5" />
          조회
        </Button>
        {onFill && (
          <Button
            type="button"
            size="sm"
            disabled={!canFill || isFilling}
            className="bg-violet-600 text-xs text-white hover:bg-violet-700"
            onClick={onFill}
            title="선택한 달을 어제(D-1)까지 조회해 비어있는 날짜만 적재합니다(이미 있는 날은 보존)."
          >
            <DownloadCloud className="h-3.5 w-3.5" />
            {isFilling ? '호출 중…' : '호출'}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={!canDownload}
          className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
          onClick={onDownloadCsv}
          title="조회 결과 전체를 CSV로 내려받기"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </div>
    </div>
  )
}
