import { useState } from 'react'
import { toast } from 'sonner'
import { downloadCsv } from '@/utils/csv'
import {
  useReservationStatsSystem,
  useReservationStatsSnapshots,
} from '@/hooks/reservation/useReservationStatsSystem'
import { ReservationStatsToolbar } from './ReservationStatsToolbar'
import {
  CHANNEL_COLUMNS,
  DEFAULT_PERIOD,
  SUMMARY_COLUMNS,
  buildReservationStatsCsv,
  getDisplayRowsFromCounts,
  monthFullLabel,
  monthShortLabel,
  type ColumnMeta,
  type DisplayRow,
  type Granularity,
  type SummaryColumnMeta,
} from './reservationStatsSystemData'
import {
  ReservationStatsTableHeader,
  type StatsHeaderModel,
  type StatsHeaderNode,
} from './shared/ReservationStatsTableHeader'
import { currentMonth, periodRange } from './shared/reservationStatsDateRange'
import {
  formatChannelValue,
  formatNumber,
  formatSummaryValue,
} from './shared/reservationStatsFormat'
import { columnSpan, splitColumnGroups } from './shared/reservationStatsTable'

/**
 * 예약통계시스템 — 콜/온라인/채팅/취소 채널과 내원·부도·취소 종합을 한 줄(가로 스크롤) 표로 묶은 월간 종합표.
 * 분리된 툴바(ReservationStatsToolbar)에서 월 선택·조회·초기화·CSV를 처리하고, 조회 단위(월/주/일/전체)는 즉시 전환된다.
 * 운영 데이터(확정 스냅샷·라이브)로 표시하며, 미연결 시 시드 폴백 없이 안내만 노출한다.
 */

const TOTAL_COL_SPAN = 2 + columnSpan(CHANNEL_COLUMNS, SUMMARY_COLUMNS) // 구분 + 총예약 + 채널 + 종합

const SYSTEM_CHANNEL_GROUPS = splitColumnGroups(CHANNEL_COLUMNS, [
  { key: 'inboundCall', span: 8 },
  { key: 'tm', span: 10 },
  { key: 'home', span: 3 },
  { key: 'naver', span: 6 },
  { key: 'kakao', span: 3 },
  { key: 'cancel', span: 3 },
] as const)

/* ── 셀 스타일 ──
 * border-separate + 셀별 하단/우측 보더(1px) — sticky 헤더 배경 비침(border-collapse 렌더 버그) 방지.
 * 표 외곽 상/좌 라인은 스크롤 컨테이너의 border가 담당한다. */
const cellBase = 'border-b border-r border-slate-400 px-2.5 py-1 whitespace-nowrap'
/** 숫자·% 데이터 셀 — 우측 정렬. */
const numCell = `${cellBase} text-right tabular-nums`
/** 구분(Date) 등 라벨 셀 — 가운데 정렬. */
const labelCell = `${cellBase} text-center`
const groupHead = 'border-b border-r border-slate-400 px-2.5 py-1.5 text-center font-semibold'
/** 채널/종합 블록 경계의 굵은 구분선. */
const divider = 'border-l-2 border-l-slate-600'
/** 고정 좌측(Date) 열 우측 구분선. */
const leftDivider = 'border-r-2 border-r-slate-600'

/* ── 스크롤 시 헤더 고정 — 3행을 누적 top으로 쌓는다(1·2행 높이 = h-8 = 32px). ── */
const headH = 'h-8'
const stickyRow1 = 'sticky top-0 z-20'
const stickyRow2 = 'sticky top-8 z-20'
const stickyRow3 = 'sticky top-16 z-20'
/** 좌상단 모서리(Date) — 가로·세로 동시 고정. */
const stickyCorner = 'sticky top-0 left-0 z-30'
/** 헤더 하단 경계선(border-collapse 스크롤 시에도 유지되도록 inset shadow). */
const headBottom = 'shadow-[inset_0_-2px_0_0_#475569]'
const headerClasses = {
  groupHead,
  headH,
  headBottom,
  stickyCorner,
  stickyRows: [stickyRow1, stickyRow2, stickyRow3],
  leftDivider,
} as const

/**
 * 헤더 라벨을 4글자 단위로 끊어 줄바꿈한다(4글자까지는 한 줄에서 안 깨짐).
 * 점(·)·괄호 등 기호와 공백은 글자 수로 세지 않고 직전 글자에 붙인다.
 *   '신규예약문의' → ['신규예약', '문의'] / '콜·네이버' → ['콜·네이버'] / '예약(부도)' → ['예약(부도)']
 */
const isCountChar = (ch: string) => /[0-9A-Za-z가-힣]/.test(ch)
function chunkLabel(label: string, size = 4): string[] {
  const chunks: string[] = []
  let cur = ''
  let count = 0
  for (const ch of label) {
    if (ch === ' ') continue // 공백은 무시(붙임)
    if (isCountChar(ch)) {
      if (count >= size) {
        chunks.push(cur)
        cur = ''
        count = 0
      }
      cur += ch
      count++
    } else {
      cur += ch // 기호는 글자 수 미포함, 현재 청크에 붙임
    }
  }
  if (cur) chunks.push(cur)
  // 3줄 이상으로 끊겨 마지막 줄에 한 글자만 남으면(예: '신규문의/대비예약/율') 직전 줄에 붙여 고아 글자 방지.
  if (chunks.length >= 3 && chunks[chunks.length - 1].length === 1) {
    const orphan = chunks.pop()!
    chunks[chunks.length - 1] += orphan
  }
  return chunks
}

/** 헤더 셀 라벨 — 4글자 청크마다 줄바꿈, 청크 내부는 줄바꿈 금지. */
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

type SystemHeaderColumn = ColumnMeta | SummaryColumnMeta

const leaf = (
  column: SystemHeaderColumn,
  className: string,
): StatsHeaderNode<SystemHeaderColumn> => ({
  kind: 'leaf',
  column,
  className,
})

const group = (
  label: string,
  className: string,
  children: readonly StatsHeaderNode<SystemHeaderColumn>[],
): StatsHeaderNode<SystemHeaderColumn> => ({
  kind: 'group',
  label,
  className,
  children,
})

const channelLeaves = (columns: readonly ColumnMeta[]) =>
  columns.map((col) =>
    leaf(col, `bg-white font-medium ${col.emphasis ? 'text-rose-600' : 'text-slate-700'}`),
  )

const summaryLeaves = SUMMARY_COLUMNS.map((col, i) =>
  leaf(
    col,
    `${i === 0 ? divider : ''} ${col.emphasis ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100'}`,
  ),
)

const SYSTEM_HEADER_NODES: StatsHeaderNode<SystemHeaderColumn>[] = [
  group('콜', 'bg-amber-100', [
    group('검사 인입콜', 'bg-amber-50', channelLeaves(SYSTEM_CHANNEL_GROUPS.inboundCall)),
    group('TM', 'bg-amber-50', channelLeaves(SYSTEM_CHANNEL_GROUPS.tm)),
  ]),
  group('온라인 예약', 'bg-emerald-100', [
    group('홈페이지', 'bg-emerald-50', channelLeaves(SYSTEM_CHANNEL_GROUPS.home)),
    group('네이버', 'bg-emerald-50', channelLeaves(SYSTEM_CHANNEL_GROUPS.naver)),
  ]),
  group('채팅', 'bg-sky-100', [
    group('카카오톡', 'bg-sky-50', channelLeaves(SYSTEM_CHANNEL_GROUPS.kakao)),
  ]),
  group('취소', 'bg-slate-100', SYSTEM_CHANNEL_GROUPS.cancel.map((col) => leaf(col, 'bg-slate-50'))),
  group('예약 종합 (내원 · 부도 · 취소)', `${divider} bg-emerald-200`, summaryLeaves),
]

const systemHeaderModel = (period: string): StatsHeaderModel<SystemHeaderColumn> => ({
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
  leadingCells: [
    {
      key: 'totalReservation',
      content: '총예약',
      className: 'bg-sky-500 text-white',
    },
  ],
  nodes: SYSTEM_HEADER_NODES,
})

export function ReservationStatsSystemPage() {
  const [draftMonth, setDraftMonth] = useState(DEFAULT_PERIOD)
  const [appliedMonth, setAppliedMonth] = useState(DEFAULT_PERIOD)
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [hasSearched, setHasSearched] = useState(false) // [조회] 누르기 전엔 자동 조회하지 않음

  const { from, to, lastDay } = periodRange(appliedMonth)
  const { dailies, isLoading, isFetching, isError } = useReservationStatsSystem(from, to, hasSearched)
  // 조회 전에는 빈 상태. 운영 데이터가 오면 카운트→행 계산.
  // 미연결/실패(503)는 시드로 폴백하지 않는다(잘못된 수치 표시 방지) — tbody에서 미연결 안내.
  const live = Boolean(dailies && !isError)
  const rows = !hasSearched || !live ? [] : getDisplayRowsFromCounts(granularity, dailies!, appliedMonth, lastDay)
  const hasData = rows.length > 0

  const { isLocked, fillSnapshot, isFilling } = useReservationStatsSnapshots()
  const lockedDraft = isLocked(draftMonth) // 호출 대상(선택 월) 잠금 여부
  // 호출(증분 채움): 선택 월을 D-1까지 비어있는 날만 적재 → 적용·표시.
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
    downloadCsv(`예약통계_${appliedMonth}_${granularity}.csv`, buildReservationStatsCsv(rows))
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
        onFill={handleFill}
        isFilling={isFilling}
        canFill={!lockedDraft}
      />

      <div className={`${tableViewportClass} overflow-auto rounded-md border border-slate-400 bg-white`}>
        <table className="min-w-[1800px] border-separate border-spacing-0 text-xs">
          <ReservationStatsTableHeader
            model={systemHeaderModel(appliedMonth)}
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

/** 데이터 로딩 중 표시 — 임시 데이터 대신 펄스 스켈레톤 행. */
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

function BodyRow({ row }: { row: DisplayRow }) {
  const { channel, summary, tier, isTotal, muted, weekStart } = row
  const isSunday = row.weekday === '일'

  const rowBg =
    tier === 'month'
      ? 'bg-sky-50 font-semibold'
      : tier === 'week'
        ? 'bg-amber-100/70 font-medium'
        : muted
          ? 'bg-slate-50 text-slate-400'
          : 'bg-white hover:bg-sky-50/60'
  // 좌측 Date 셀 — 일요일은 붉은 글씨(달력 관례).
  const leftBg =
    tier === 'month'
      ? 'bg-sky-100 text-sky-700'
      : tier === 'week'
        ? 'bg-amber-100 text-amber-800'
        : isSunday
          ? 'bg-rose-50 text-rose-600'
          : 'bg-amber-50 text-slate-700'
  // 일별 주 경계(토→일)는 가볍게: 셀과 같은 톤의 2px로 은은하게만 구분(다른 구분선은 진하게 유지).
  const topBorder = weekStart && tier === 'day' ? 'border-t-2 border-t-slate-400' : ''

  return (
    <tr className={`${rowBg} ${topBorder} transition-colors`}>
      <th className={`${labelCell} ${leftDivider} sticky left-0 z-10 font-semibold ${leftBg}`}>
        {row.label}
        {row.weekday ? ` (${row.weekday})` : ''}
      </th>
      <td className={`${numCell} font-semibold ${isTotal ? 'text-sky-700' : muted ? '' : 'bg-sky-50/60 text-sky-700'}`}>
        {muted ? <span className="text-slate-300">–</span> : formatNumber(channel.totalReservation)}
      </td>

      {CHANNEL_COLUMNS.map((col) =>
        muted ? (
          <td key={col.key} className={`${numCell} text-slate-300`}>
            –
          </td>
        ) : (
          <td key={col.key} className={`${numCell} ${col.emphasis ? 'text-rose-600' : ''}`}>
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
