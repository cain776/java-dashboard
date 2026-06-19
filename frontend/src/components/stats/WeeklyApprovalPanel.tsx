import { Check, CheckCircle2, Lock } from 'lucide-react'
import { shortDate, weekSpillNote } from '@/utils/weekBucket'
import type { WeekGroup } from '@/hooks/useWeeklyApproval'

/**
 * 주별 승인 패널 — 리스트 페이지 공용(예약자/검사자/백내장검사자/수술자).
 * 주차 카드(주차·기간·건수·승인 토글) + 진행 상태 + 합계. 카드 클릭 시 상위에서 상세 표를 해당 주차로 필터.
 * 상태는 가지지 않는 프리젠테이션 컴포넌트 — useWeeklyApproval 훅과 함께 사용.
 */

const formatCount = (n: number) => n.toLocaleString('ko-KR')

interface WeeklyApprovalPanelProps {
  weeks: WeekGroup[]
  approved: Set<string>
  selectedWeek: string | null
  onToggleApprove: (key: string) => void
  onSelectWeek: (key: string) => void
  /** 제목 옆 부제 — 예: "검사자 · 전체 (검사일 기준)" */
  subtitle?: string
  /** 합계 라벨 (기본 "합계") — 예: "월 합계" */
  totalLabel?: string
}

export function WeeklyApprovalPanel({
  weeks,
  approved,
  selectedWeek,
  onToggleApprove,
  onSelectWeek,
  subtitle,
  totalLabel = '합계',
}: WeeklyApprovalPanelProps) {
  if (weeks.length === 0) return null

  const approvedWeekCount = weeks.filter((w) => approved.has(w.ref.key)).length
  const allApproved = approvedWeekCount === weeks.length
  const totalCount = weeks.reduce((sum, w) => sum + w.count, 0)
  const approvedCount = weeks
    .filter((w) => approved.has(w.ref.key))
    .reduce((sum, w) => sum + w.count, 0)
  const hasPartial = weeks.some((w) => w.ref.partial)

  return (
    <div className="rounded-md border border-border/70 bg-white px-3 py-2 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-900">
          주별 승인
          {subtitle && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{subtitle}</span>}
        </span>
        {allApproved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> 마감 완료
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            진행중 {approvedWeekCount}/{weeks.length}주 승인
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          승인 합계 <strong className="tabular-nums text-gray-900">{formatCount(approvedCount)}</strong> / {totalLabel} {formatCount(totalCount)}건
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {weeks.map((w) => {
          const isApproved = approved.has(w.ref.key)
          const isSelected = selectedWeek === w.ref.key
          const spill = w.ref.partial ? weekSpillNote(w.ref) : null
          return (
            <div
              key={w.ref.key}
              className={`flex items-center gap-2.5 rounded-md border px-3 py-1.5 transition-colors ${
                isSelected ? 'border-blue-400 bg-blue-50/50' : 'border-border/70 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectWeek(w.ref.key)}
                className="flex flex-col items-start gap-0.5 text-left"
                title="클릭 시 아래 표를 이 주차로 필터"
              >
                <span className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">
                    {w.ref.week}주{w.ref.partial ? '*' : ''}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {shortDate(w.ref.startDate)}~{shortDate(w.ref.endDate)}
                    {w.ref.partial && ` · ${w.ref.days}일`}
                  </span>
                </span>
                {spill && <span className="text-[10px] tabular-nums text-amber-600">{spill}</span>}
              </button>
              <span className="border-l border-border/60 pl-2.5 text-sm font-bold tabular-nums text-gray-900">
                {formatCount(w.count)}
              </span>
              <button
                type="button"
                onClick={() => onToggleApprove(w.ref.key)}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                  isApproved
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-border/80 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {isApproved ? <><Lock className="h-3 w-3" /> 승인됨</> : <><Check className="h-3 w-3" /> 승인</>}
              </button>
            </div>
          )
        })}
      </div>
      {hasPartial && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-amber-600">*</span> 부분 주 — 월 경계에 걸친 주는 월요일~일요일 중 이 달에 속한 날만 집계합니다(나머지는 이웃 달로). 중간 주는 모두 7일.
        </p>
      )}
      {selectedWeek && (
        <button
          type="button"
          onClick={() => onSelectWeek(selectedWeek)}
          className="mt-2 text-[11px] text-blue-600 hover:underline"
        >
          주차 필터 해제 (전체 보기)
        </button>
      )}
    </div>
  )
}
