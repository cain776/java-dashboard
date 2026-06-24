import { useState } from 'react'
import { toast } from 'sonner'
import { buildReservationStatsDiffCsv } from '@/api/reservation/reservationStatsDiagnostics'
import { downloadCsv } from '@/utils/csv'
import {
  useReservationStatsCataract,
  useReservationStatsCataractSnapshots,
} from '@/hooks/reservation/useReservationStatsCataract'
import { ReservationStatsToolbar } from './ReservationStatsToolbar'
import {
  CATARACT_COLUMNS,
  DEFAULT_PERIOD,
  SUMMARY_COLUMNS,
  buildCataractStatsCsv,
  getDisplayRowsFromCounts,
  monthFullLabel,
  monthShortLabel,
  type CataractColumnMeta,
  type CataractDisplayRow,
  type Granularity,
} from './reservationStatsCataractData'
import {
  ReservationStatsTableHeader,
  type StatsHeaderModel,
  type StatsHeaderNode,
} from './shared/ReservationStatsTableHeader'
import { currentMonth, periodRange } from './shared/reservationStatsDateRange'
import {
  formatChannelValue,
  formatSummaryValue,
} from './shared/reservationStatsFormat'
import type { SummaryColumnMeta } from './shared/reservationStatsSummary'
import { columnSpan, splitColumnGroups } from './shared/reservationStatsTable'

/**
 * 예약통계_백내장 — 인바운드(컨택센터)/아웃바운드(TM)/채팅/온라인/취소 채널과 내원·부도·취소 종합을
 * 한 줄(가로 스크롤) 표로 묶은 월간 종합표. 시력교정 페이지와 동일한 조회/CSV/스냅샷 흐름을 따른다.
 * 운영 데이터(확정 스냅샷·라이브)로 표시하며, 미연결 시 시드 폴백 없이 안내만 노출한다.
 */

// Date + 25 채널 + 7 종합
const TOTAL_COL_SPAN = 1 + columnSpan(CATARACT_COLUMNS, SUMMARY_COLUMNS)

// 헤더 밴드/그룹용 컬럼 슬라이스
const CATARACT_CHANNEL_GROUPS = splitColumnGroups(CATARACT_COLUMNS, [
  { key: 'total', span: 3 },
  { key: 'inboundPlain', span: 3 },
  { key: 'inboundCataract', span: 5 },
  { key: 'outboundCataract', span: 5 },
  { key: 'outboundTail', span: 1 },
  { key: 'kakao', span: 3 },
  { key: 'online', span: 2 },
  { key: 'cancel', span: 3 },
] as const)

const TOTAL_COLS = CATARACT_CHANNEL_GROUPS.total // 백내장·노안·합계
const INBOUND_PLAIN = CATARACT_CHANNEL_GROUPS.inboundPlain // 총인입콜·응대콜·응대율
const INBOUND_CATARACT = CATARACT_CHANNEL_GROUPS.inboundCataract // 인바운드 백내장 밴드
const OUTBOUND_CATARACT = CATARACT_CHANNEL_GROUPS.outboundCataract // 아웃바운드 백내장 밴드
const OUTBOUND_TAIL = CATARACT_CHANNEL_GROUPS.outboundTail // 아웃바운드 총 예약수
const KAKAO_COLS = CATARACT_CHANNEL_GROUPS.kakao
const ONLINE_COLS = CATARACT_CHANNEL_GROUPS.online
const CANCEL_COLS = CATARACT_CHANNEL_GROUPS.cancel

/* ── 셀 스타일 (시력교정 페이지와 동일 규칙) ── */
const cellBase = 'border-b border-r border-slate-400 px-2.5 py-1 whitespace-nowrap'
const numCell = `${cellBase} text-right tabular-nums`
const labelCell = `${cellBase} text-center`
const groupHead = 'border-b border-r border-slate-400 px-2.5 py-1.5 text-center font-semibold'
const divider = 'border-l-2 border-l-slate-600'
const leftDivider = 'border-r-2 border-r-slate-600'

const headH = 'h-8'
const stickyRow1 = 'sticky top-0 z-20'
const stickyRow2 = 'sticky top-8 z-20'
const stickyRow3 = 'sticky top-16 z-20'
const stickyCorner = 'sticky top-0 left-0 z-30'
const headBottom = 'shadow-[inset_0_-2px_0_0_#475569]'
const headerClasses = {
  groupHead,
  headH,
  headBottom,
  stickyCorner,
  stickyRows: [stickyRow1, stickyRow2, stickyRow3],
  leftDivider,
} as const

const isCountChar = (ch: string) => /[0-9A-Za-z가-힣★]/.test(ch)
const countChars = (s: string) => [...s].filter(isCountChar).length
/**
 * 백내장 헤더 라벨 — 공백을 줄바꿈 지점으로 삼아 단어 단위로 줄바꿈한다(단어 중간은 쪼개지 않음).
 * 한 줄에 size(기본 4)글자(공백·기호 제외)까지 인접 단어를 묶고, 한 단어가 그보다 길면 그 단어만 한 줄에 둔다.
 *   '재문의 비율' → ['재문의','비율'] / '컨택센터 현장(CRM)' → ['컨택센터','현장(CRM)'] / '총 DB 예약율' → ['총 DB','예약율']
 */
function chunkLabel(label: string, size = 4): string[] {
  const lines: string[] = []
  let cur = ''
  let curCount = 0
  for (const word of label.split(' ')) {
    if (!word) continue
    const wc = countChars(word)
    if (cur === '') {
      cur = word
      curCount = wc
    } else if (curCount + wc <= size) {
      cur += ' ' + word
      curCount += wc
    } else {
      lines.push(cur)
      cur = word
      curCount = wc
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function ColLabel({ label }: { label: string }) {
  return (
    <>
      {chunkLabel(label).map((part, i) => (
        <span key={i} className="block whitespace-nowrap">
          {part}
        </span>
      ))}
    </>
  )
}

type CataractHeaderColumn = CataractColumnMeta | SummaryColumnMeta

const leaf = (
  column: CataractHeaderColumn,
  className: string,
): StatsHeaderNode<CataractHeaderColumn> => ({
  kind: 'leaf',
  column,
  className,
})

const group = (
  label: string,
  className: string,
  children: readonly StatsHeaderNode<CataractHeaderColumn>[],
): StatsHeaderNode<CataractHeaderColumn> => ({
  kind: 'group',
  label,
  className,
  children,
})

const midLeafClass = (col: CataractColumnMeta) =>
  `bg-white font-medium ${col.emphasis ? 'text-rose-600' : 'text-slate-700'}`

const cataractLeaves = (columns: readonly CataractColumnMeta[]) =>
  columns.map((col) => leaf(col, midLeafClass(col)))

const cataractSummaryLeaves = SUMMARY_COLUMNS.map((col, i) =>
  leaf(
    col,
    `${i === 0 ? divider : ''} ${col.emphasis ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100'}`,
  ),
)

const CATARACT_HEADER_NODES: StatsHeaderNode<CataractHeaderColumn>[] = [
  group(
    '총 예약 (아웃바운드 포함)',
    'bg-sky-200',
    TOTAL_COLS.map((col) => leaf(col, 'bg-sky-50 font-semibold text-sky-800')),
  ),
  group('인바운드 (컨택센터)', 'bg-amber-100', [
    ...cataractLeaves(INBOUND_PLAIN),
    group('백내장', 'bg-rose-50 text-rose-700', cataractLeaves(INBOUND_CATARACT)),
  ]),
  group('아웃바운드 (TM)', 'bg-amber-200', [
    group('백내장', 'bg-rose-50 text-rose-700', cataractLeaves(OUTBOUND_CATARACT)),
    ...cataractLeaves(OUTBOUND_TAIL),
  ]),
  group('채팅 (카카오톡)', 'bg-sky-100', cataractLeaves(KAKAO_COLS)),
  group('온라인예약', 'bg-emerald-100', cataractLeaves(ONLINE_COLS)),
  group('취소', 'bg-slate-100', cataractLeaves(CANCEL_COLS)),
  group('예약 종합 (내원 · 부도 · 취소)', `${divider} bg-emerald-200`, cataractSummaryLeaves),
]

const cataractHeaderModel = (period: string): StatsHeaderModel<CataractHeaderColumn> => ({
  corner: {
    content: (
      <>
        {monthShortLabel(period)}
        <br />
        Date
      </>
    ),
    className: 'bg-slate-100',
  },
  nodes: CATARACT_HEADER_NODES,
})

export function ReservationStatsCataractPage() {
  const [draftMonth, setDraftMonth] = useState(DEFAULT_PERIOD)
  const [appliedMonth, setAppliedMonth] = useState(DEFAULT_PERIOD)
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [hasSearched, setHasSearched] = useState(false)

  const { from, to, lastDay } = periodRange(appliedMonth)
  const { dailies, isLoading, isFetching, isError } = useReservationStatsCataract(from, to, hasSearched)
  const live = Boolean(dailies && !isError)
  // 미연결/실패(503)는 시드로 폴백하지 않는다(잘못된 수치 표시 방지) — tbody에서 미연결 안내.
  const rows = !hasSearched || !live ? [] : getDisplayRowsFromCounts(granularity, dailies!, appliedMonth, lastDay)
  const hasData = rows.length > 0

  const { isLocked, fillSnapshot, isFilling, getDiff, isDiffing } = useReservationStatsCataractSnapshots()
  const lockedDraft = isLocked(draftMonth) // 호출 대상(선택 월) 잠금 여부
  // 호출(증분 채움): 선택 월을 D-1까지 비어있는 날만 라이브 적재 → 적용·표시. (인입콜·TM·노안은 0)
  const handleFill = async () => {
    if (lockedDraft) return
    try {
      await fillSnapshot(draftMonth)
      setAppliedMonth(draftMonth)
      setHasSearched(true)
    } catch (e) {
      toast.error('호출 실패', { description: e instanceof Error ? e.message : undefined })
    }
  }
  const tableViewportClass = granularity === 'month' ? 'max-h-[72vh]' : 'min-h-0 flex-1'

  const handleSearch = () => {
    setAppliedMonth(draftMonth)
    setHasSearched(true)
  }
  const handleReset = () => {
    setDraftMonth(DEFAULT_PERIOD)
    setAppliedMonth(DEFAULT_PERIOD)
    setGranularity('month')
    setHasSearched(false)
  }
  const handleDownloadCsv = () => {
    if (!hasData) return
    downloadCsv(`예약통계_백내장_${appliedMonth}_${granularity}.csv`, buildCataractStatsCsv(rows))
  }
  const handleRunDiagnostics = async () => {
    try {
      const diff = await getDiff(draftMonth)
      if (!diff.snapshotExists) {
        toast.error('진단 불가', { description: `${draftMonth} 스냅샷이 없습니다.` })
        return
      }
      if (diff.diffCount === 0) {
        toast.success('진단 완료', { description: '스냅샷과 라이브 재조회값의 차이가 없습니다.' })
        return
      }
      downloadCsv(`예약통계_백내장_진단_${draftMonth}.csv`, buildReservationStatsDiffCsv(diff))
      toast('진단 완료', { description: `${diff.diffCount.toLocaleString('ko-KR')}건의 차이를 CSV로 내려받았습니다.` })
    } catch (e) {
      toast.error('진단 실패', { description: e instanceof Error ? e.message : undefined })
    }
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden p-1 text-xs text-gray-800">
      <ReservationStatsToolbar
        draftMonth={draftMonth}
        onDraftMonthChange={setDraftMonth}
        maxMonth={currentMonth()}
        granularity={granularity}
        onGranularityChange={setGranularity}
        onSearch={handleSearch}
        onReset={handleReset}
        onDownloadCsv={handleDownloadCsv}
        canDownload={hasData}
        onRunDiagnostics={handleRunDiagnostics}
        isDiagnosing={isDiffing}
        canRunDiagnostics={!isDiffing}
        onFill={handleFill}
        isFilling={isFilling}
        canFill={!lockedDraft}
      />

      <div className={`${tableViewportClass} overflow-auto rounded-md border border-slate-400 bg-white`}>
        <table className="min-w-[1800px] border-separate border-spacing-0 text-xs">
          <ReservationStatsTableHeader
            model={cataractHeaderModel(appliedMonth)}
            classes={headerClasses}
            renderLabel={(label) => <ColLabel label={label} />}
          />
          <tbody>
            {!hasSearched ? (
              <tr>
                <td colSpan={TOTAL_COL_SPAN} className={`${labelCell} bg-white py-12 text-sm text-muted-foreground`}>
                  기준 월을 선택하고 <span className="font-semibold text-slate-700">조회</span> 버튼을 눌러 데이터를 불러오세요.
                </td>
              </tr>
            ) : isLoading || isFetching ? (
              <SkeletonRows />
            ) : hasData ? (
              rows.map((row) => <BodyRow key={`${granularity}-${row.label}`} row={row} />)
            ) : (
              <tr>
                <td colSpan={TOTAL_COL_SPAN} className={`${labelCell} bg-white py-8 text-sm text-muted-foreground`}>
                  {isError
                    ? '운영 데이터에 연결되지 않았습니다 (미연결). 잠시 후 다시 조회해주세요.'
                    : `${monthFullLabel(appliedMonth)} 조회 결과가 없습니다.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const SKELETON_ROW_COUNT = 12

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, r) => (
        <tr key={r} className="bg-white">
          <th className={`${labelCell} ${leftDivider} sticky left-0 z-10 bg-white`}>
            <div className="mx-auto h-3 w-8 animate-pulse rounded bg-slate-200" />
          </th>
          {Array.from({ length: TOTAL_COL_SPAN - 1 }).map((__, c) => (
            <td key={c} className={numCell}>
              <div className="ml-auto h-3 w-9 animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function BodyRow({ row }: { row: CataractDisplayRow }) {
  const { channel, summary, tier, muted, weekStart } = row
  const isSunday = row.weekday === '일'

  const rowBg =
    tier === 'month'
      ? 'bg-sky-50 font-semibold'
      : tier === 'week'
        ? 'bg-amber-100/70 font-medium'
        : muted
          ? 'bg-slate-50 text-slate-400'
          : 'bg-white hover:bg-sky-50/60'
  const leftBg =
    tier === 'month'
      ? 'bg-sky-100 text-sky-700'
      : tier === 'week'
        ? 'bg-amber-100 text-amber-800'
        : isSunday
          ? 'bg-rose-50 text-rose-600'
          : 'bg-amber-50 text-slate-700'
  const topBorder = weekStart && tier === 'day' ? 'border-t-2 border-t-slate-400' : ''

  return (
    <tr className={`${rowBg} ${topBorder} transition-colors`}>
      <th className={`${labelCell} ${leftDivider} sticky left-0 z-10 font-semibold ${leftBg}`}>
        {row.label}
        {row.weekday ? ` (${row.weekday})` : ''}
      </th>

      {CATARACT_COLUMNS.map((col) =>
        muted ? (
          <td key={col.key} className={`${numCell} text-slate-300`}>
            –
          </td>
        ) : (
          <td
            key={col.key}
            className={`${numCell} ${col.emphasis ? 'text-rose-600' : ''} ${
              col.key === 'totalSum' ? 'bg-sky-50/60 font-semibold text-sky-700' : ''
            }`}
          >
            {formatChannelValue(channel[col.key], col.fmt)}
          </td>
        ),
      )}

      {SUMMARY_COLUMNS.map((col, i) =>
        muted ? (
          <td key={col.key} className={`${numCell} text-slate-300 ${i === 0 ? divider : ''}`}>
            –
          </td>
        ) : (
          <td
            key={col.key}
            className={`${numCell} ${i === 0 ? divider : ''} ${col.emphasis ? 'bg-rose-50 text-rose-600' : ''}`}
          >
            {formatSummaryValue(summary[col.key], col.fmt)}
          </td>
        ),
      )}
    </tr>
  )
}
