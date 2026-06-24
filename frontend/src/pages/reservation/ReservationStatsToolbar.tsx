import { RotateCcw, Search, Download, Lock, CheckCircle2 } from 'lucide-react'
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
  resultLabel: string
  dataStatus: 'idle' | 'live' | 'loading' | 'seed'
  onSearch: () => void
  onReset: () => void
  onDownloadCsv: () => void
  canDownload: boolean
  /** 적용 월이 확정(스냅샷) 저장됐는지. */
  isConfirmed: boolean
  /** PDF 고정 스냅샷(2026-01~05) — 재확정 금지. */
  isLocked: boolean
  onSaveSnapshot: () => void
  isSaving: boolean
  canSave: boolean
}

export function ReservationStatsToolbar({
  draftMonth,
  onDraftMonthChange,
  maxMonth,
  granularity,
  onGranularityChange,
  resultLabel,
  dataStatus,
  onSearch,
  onReset,
  onDownloadCsv,
  canDownload,
  isConfirmed,
  isLocked,
  onSaveSnapshot,
  isSaving,
  canSave,
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

      <div className="flex h-8 items-center gap-2 rounded-md border border-border/70 bg-white px-2.5 text-xs font-medium text-slate-600">
        <span>{resultLabel}</span>
        {dataStatus === 'idle' ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">조회 전</span>
        ) : dataStatus === 'live' ? (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">운영 데이터</span>
        ) : dataStatus === 'loading' ? (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">불러오는 중…</span>
        ) : (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">시드(미연결)</span>
        )}
        {isLocked ? (
          <span className="flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-violet-700" title="PDF(골든와이즈 RSS) 고정 데이터 — 재확정으로 덮어쓰지 않습니다.">
            <Lock className="h-3 w-3" />
            PDF 고정
          </span>
        ) : isConfirmed ? (
          <span className="flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
            <CheckCircle2 className="h-3 w-3" />
            확정됨
          </span>
        ) : null}
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
        <Button
          type="button"
          size="sm"
          disabled={!canSave || isSaving}
          className="bg-indigo-600 text-xs text-white hover:bg-indigo-700"
          onClick={onSaveSnapshot}
          title={
            isLocked
              ? 'PDF(골든와이즈 RSS) 고정 데이터라 재확정(덮어쓰기)할 수 없습니다.'
              : '이 달 데이터를 JSON 스냅샷으로 확정 저장(이후 조회는 동결값을 즉시 로드)'
          }
        >
          <Lock className="h-3.5 w-3.5" />
          {isLocked ? 'PDF 고정' : isSaving ? '저장 중…' : isConfirmed ? '재확정' : '확정 저장'}
        </Button>
      </div>
    </div>
  )
}
