import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  ReservationStatsDiff,
  ReservationStatsDiffItem,
  ReservationStatsDrillDown,
} from '@/api/reservation/reservationStatsDiagnostics'

interface Props {
  title: string
  diff: ReservationStatsDiff
  drillDown: ReservationStatsDrillDown | null
  isDrillingDown: boolean
  onClose: () => void
  onSelectDiff: (item: ReservationStatsDiffItem) => void
  onDownloadDiffCsv: () => void
  onDownloadDrillDownCsv: () => void
}

const formatNullable = (value: number | null) => (value === null ? '-' : value.toLocaleString('ko-KR'))

export function ReservationStatsDiagnosticsModal({
  title,
  diff,
  drillDown,
  isDrillingDown,
  onClose,
  onSelectDiff,
  onDownloadDiffCsv,
  onDownloadDrillDownCsv,
}: Props) {
  const selectedKey = drillDown ? `${drillDown.date}:${drillDown.field}` : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[88vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">
              {diff.period} · {diff.diffCount.toLocaleString('ko-KR')}건
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onDownloadDiffCsv}>
              <Download className="h-3.5 w-3.5" />
              Diff CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={!drillDown}
              onClick={onDownloadDrillDownCsv}
            >
              <Download className="h-3.5 w-3.5" />
              상세 CSV
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="닫기">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
          <div className="min-h-0 overflow-auto border-b border-slate-200 lg:border-r lg:border-b-0">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
                <tr>
                  <th className="border-b border-slate-300 px-3 py-2 text-left">일자</th>
                  <th className="border-b border-slate-300 px-3 py-2 text-left">필드</th>
                  <th className="border-b border-slate-300 px-3 py-2 text-right">스냅샷</th>
                  <th className="border-b border-slate-300 px-3 py-2 text-right">라이브</th>
                  <th className="border-b border-slate-300 px-3 py-2 text-right">차이</th>
                </tr>
              </thead>
              <tbody>
                {diff.diffs.map((item) => {
                  const key = `${item.date}:${item.field}`
                  return (
                    <tr
                      key={key}
                      className={`cursor-pointer ${selectedKey === key ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      onClick={() => onSelectDiff(item)}
                    >
                      <td className="border-b border-slate-200 px-3 py-2 font-medium text-slate-800">{item.date}</td>
                      <td className="border-b border-slate-200 px-3 py-2 text-slate-700">{item.field}</td>
                      <td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums">
                        {formatNullable(item.snapshotValue)}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums">
                        {formatNullable(item.liveValue)}
                      </td>
                      <td className="border-b border-slate-200 px-3 py-2 text-right font-semibold tabular-nums text-rose-600">
                        {formatNullable(item.delta)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
              {drillDown
                ? `${drillDown.date} · ${drillDown.field} · ${drillDown.rowCount.toLocaleString('ko-KR')}건`
                : isDrillingDown
                  ? '조회 중'
                  : '상세'}
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {isDrillingDown ? (
                <div className="p-4 text-xs text-slate-500">조회 중...</div>
              ) : drillDown ? (
                <table className="w-full border-separate border-spacing-0 text-xs">
                  <thead className="sticky top-0 z-10 bg-white text-slate-600">
                    <tr>
                      <th className="border-b border-slate-300 px-3 py-2 text-left">source</th>
                      <th className="border-b border-slate-300 px-3 py-2 text-left">GB</th>
                      <th className="border-b border-slate-300 px-3 py-2 text-left">GB2</th>
                      <th className="border-b border-slate-300 px-3 py-2 text-left">PK</th>
                      <th className="border-b border-slate-300 px-3 py-2 text-right">기여도</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDown.rows.map((row, index) => (
                      <tr key={`${row.source}-${row.primaryKey ?? index}-${row.contribution}`}>
                        <td className="border-b border-slate-200 px-3 py-2 text-slate-700">{row.source}</td>
                        <td className="border-b border-slate-200 px-3 py-2 text-slate-800">{row.gb}</td>
                        <td className="border-b border-slate-200 px-3 py-2 text-slate-600">{row.gb2}</td>
                        <td className="border-b border-slate-200 px-3 py-2 font-mono text-[11px] text-slate-600">
                          {row.primaryKey ?? '-'}
                        </td>
                        <td className="border-b border-slate-200 px-3 py-2 text-right font-semibold tabular-nums">
                          {row.contribution.toLocaleString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-xs text-slate-500">선택된 항목 없음</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
