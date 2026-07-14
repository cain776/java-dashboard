import { useState } from 'react'
import { downloadCsv } from '@/utils/csv'
import { useOutpatientReservationStats } from '@/hooks/outpatient/useOutpatientReservationStats'
import { ReservationStatsToolbar } from '../reservation/ReservationStatsToolbar'
import {
  ReservationStatsTableHeader,
  type StatsHeaderModel,
  type StatsHeaderNode,
} from '../reservation/shared/ReservationStatsTableHeader'
import { currentMonth, periodRange } from '../reservation/shared/reservationStatsDateRange'
import { formatChannelValue, formatNumber } from '../reservation/shared/reservationStatsFormat'
import {
  CHANNEL_COLUMNS,
  DEFAULT_PERIOD,
  buildOutpatientStatsCsv,
  getOutpatientDisplayRows,
  monthFullLabel,
  monthShortLabel,
  type ColumnMeta,
  type Granularity,
  type OutpatientDisplayRow,
} from './outpatientReservationStatsData'

/**
 * 외래 예약통계 — 콜/어플/현장(CRM)/카카오톡상담/부도 채널을 한 줄(가로 스크롤) 표로 묶은 월간 종합표.
 * 예약통계_시력교정 페이지와 동일한 툴바·헤더·집계 UI를 재사용하고, 컬럼 구성과 산출식만 외래용으로 교체했다.
 * 확정 스냅샷·라이브(외래=RESERVE_FLAG='F')로 표시하며, 미연결 시 시드 폴백 없이 안내만 노출한다.
 * 미배선 채널(인입/응대콜·문의만·카톡)은 라이브에서 0으로 온다(스펙: BCRM_RSS_외래·백내장_260512).
 */

const TOTAL_COL_SPAN = 2 + CHANNEL_COLUMNS.length // 구분 + 총예약 + 채널

/** 채널 그룹 경계(굵은 구분선)를 그릴 첫 컬럼 키. */
const GROUP_DIVIDER_KEYS = new Set<ColumnMeta['key']>([
  'appReservation',
  'crmReservation',
  'kakaoAll',
  'noShowCti',
])

/* ── 셀 스타일 (예약통계_시력교정과 동일) ── */
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

/** 헤더 라벨을 4글자 단위로 끊어 줄바꿈(청크 내부는 줄바꿈 금지). */
const isCountChar = (ch: string) => /[0-9A-Za-z가-힣]/.test(ch)
function chunkLabel(label: string, size = 4): string[] {
  const chunks: string[] = []
  let cur = ''
  let count = 0
  for (const ch of label) {
    if (ch === ' ') continue
    if (isCountChar(ch)) {
      if (count >= size) {
        chunks.push(cur)
        cur = ''
        count = 0
      }
      cur += ch
      count++
    } else {
      cur += ch
    }
  }
  if (cur) chunks.push(cur)
  if (chunks.length >= 3 && chunks[chunks.length - 1].length === 1) {
    const orphan = chunks.pop()!
    chunks[chunks.length - 1] += orphan
  }
  return chunks
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

const leaf = (column: ColumnMeta, className: string): StatsHeaderNode<ColumnMeta> => ({
  kind: 'leaf',
  column,
  className,
})

const group = (
  label: string,
  className: string,
  children: readonly StatsHeaderNode<ColumnMeta>[],
): StatsHeaderNode<ColumnMeta> => ({
  kind: 'group',
  label,
  className,
  children,
})

const groupLeaves = (columns: readonly ColumnMeta[], firstDivider: boolean) =>
  columns.map((col, i) =>
    leaf(
      col,
      `${firstDivider && i === 0 ? divider : ''} ${
        col.strong
          ? 'bg-amber-100 font-bold text-slate-900'
          : `bg-white font-medium ${col.emphasis ? 'text-rose-600' : 'text-slate-700'}`
      }`,
    ),
  )

const HEADER_NODES: StatsHeaderNode<ColumnMeta>[] = [
  group('콜', 'bg-amber-100', groupLeaves(CHANNEL_COLUMNS.slice(0, 13), false)),
  group('어플', `${divider} bg-sky-100`, groupLeaves(CHANNEL_COLUMNS.slice(13, 17), true)),
  group('현장(CRM)', `${divider} bg-emerald-100`, groupLeaves(CHANNEL_COLUMNS.slice(17, 21), true)),
  group('카카오톡상담', `${divider} bg-yellow-100`, groupLeaves(CHANNEL_COLUMNS.slice(21, 26), true)),
  group('부도', `${divider} bg-rose-100`, groupLeaves(CHANNEL_COLUMNS.slice(26, 29), true)),
]

const headerModel = (period: string): StatsHeaderModel<ColumnMeta> => ({
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
  nodes: HEADER_NODES,
})

export function OutpatientReservationStatsPage() {
  const [draftMonth, setDraftMonth] = useState(DEFAULT_PERIOD)
  const [appliedMonth, setAppliedMonth] = useState(DEFAULT_PERIOD)
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [hasSearched, setHasSearched] = useState(false) // [조회] 누르기 전엔 자동 조회하지 않음

  const { from, to, lastDay } = periodRange(appliedMonth)
  const { dailies, meta, isLoading, isFetching, isError, refetch } = useOutpatientReservationStats(from, to, hasSearched)
  // 조회 전에는 빈 상태. 운영 데이터가 오면 카운트→행 계산. 미연결/실패(503)는 시드로 폴백하지 않는다.
  const live = Boolean(dailies && !isError)
  const rows = !hasSearched || !live ? [] : getOutpatientDisplayRows(granularity, dailies!, appliedMonth, lastDay)
  const hasData = rows.length > 0
  const tableViewportClass = granularity === 'month' ? 'max-h-[72vh]' : 'min-h-0 flex-1'

  // 조회 = 호출 통합: 서버 GET이 당월·미잠금이면 자동 증분 채움까지 처리한다.
  // 같은 월을 다시 조회하면 쿼리 키가 안 바뀌므로 refetch로 강제 갱신(서버 자동 채움 재평가).
  const handleSearch = () => {
    const sameMonth = hasSearched && appliedMonth === draftMonth
    setAppliedMonth(draftMonth)
    setHasSearched(true)
    if (sameMonth) refetch()
  }
  const handleReset = () => {
    setDraftMonth(DEFAULT_PERIOD)
    setAppliedMonth(DEFAULT_PERIOD)
    setGranularity('month')
    setHasSearched(false)
  }
  const handleDownloadCsv = () => {
    if (!hasData) return
    downloadCsv(`외래예약통계_${appliedMonth}_${granularity}.csv`, buildOutpatientStatsCsv(rows))
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
        dataMeta={hasSearched ? meta : undefined}
      />

      <div className={`${tableViewportClass} overflow-auto rounded-md border border-slate-400 bg-white`}>
        <table className="min-w-[1700px] border-separate border-spacing-0 text-xs">
          <ReservationStatsTableHeader
            model={headerModel(appliedMonth)}
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

function BodyRow({ row }: { row: OutpatientDisplayRow }) {
  const { channel, tier, isTotal, muted, weekStart } = row
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
      <td className={`${numCell} font-semibold ${isTotal ? 'text-sky-700' : muted ? '' : 'bg-sky-50/60 text-sky-700'}`}>
        {muted ? <span className="text-slate-300">–</span> : formatNumber(channel.totalReservation)}
      </td>

      {CHANNEL_COLUMNS.map((col) =>
        muted ? (
          <td
            key={col.key}
            className={`${numCell} text-slate-300 ${GROUP_DIVIDER_KEYS.has(col.key) ? divider : ''} ${
              col.strong ? 'bg-amber-50/60' : ''
            }`}
          >
            –
          </td>
        ) : (
          <td
            key={col.key}
            className={`${numCell} ${GROUP_DIVIDER_KEYS.has(col.key) ? divider : ''} ${
              col.strong ? 'bg-amber-50/70 font-semibold text-slate-900' : col.emphasis ? 'text-rose-600' : ''
            }`}
          >
            {formatChannelValue(channel[col.key], col.fmt)}
          </td>
        ),
      )}
    </tr>
  )
}
