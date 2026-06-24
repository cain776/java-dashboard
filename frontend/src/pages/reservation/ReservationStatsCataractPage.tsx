import { useState } from 'react'
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
  getDisplayRows,
  getDisplayRowsFromCounts,
  monthFullLabel,
  monthShortLabel,
  type CataractColumnMeta,
  type CataractDisplayRow,
  type CellFormat,
  type Granularity,
  type SummaryFormat,
} from './reservationStatsCataractData'

/**
 * 예약통계_백내장 — 인바운드(컨택센터)/아웃바운드(TM)/채팅/온라인/취소 채널과 내원·부도·취소 종합을
 * 한 줄(가로 스크롤) 표로 묶은 월간 종합표. 시력교정 페이지와 동일한 조회/CSV/스냅샷 흐름을 따른다.
 * 데이터는 2026-04 시드값이며 일별 행은 주별 값을 영업일에 분배해 파생한다(PDF 스냅샷으로 채울 예정).
 */

// Date + 25 채널 + 7 종합
const TOTAL_COL_SPAN = 1 + CATARACT_COLUMNS.length + SUMMARY_COLUMNS.length

// 헤더 밴드/그룹용 컬럼 슬라이스
const TOTAL_COLS = CATARACT_COLUMNS.slice(0, 3) // 백내장·노안·합계
const INBOUND_PLAIN = CATARACT_COLUMNS.slice(3, 6) // 총인입콜·응대콜·응대율
const INBOUND_CATARACT = CATARACT_COLUMNS.slice(6, 11) // 인바운드 백내장 밴드(5)
const OUTBOUND_CATARACT = CATARACT_COLUMNS.slice(11, 16) // 아웃바운드 백내장 밴드(5)
const OUTBOUND_TAIL = CATARACT_COLUMNS.slice(16, 17) // 아웃바운드 총 예약수
const KAKAO_COLS = CATARACT_COLUMNS.slice(17, 20)
const ONLINE_COLS = CATARACT_COLUMNS.slice(20, 22)
const CANCEL_COLS = CATARACT_COLUMNS.slice(22, 25)
const ROW3_LEAVES = [...INBOUND_CATARACT, ...OUTBOUND_CATARACT] // 백내장 밴드 하위 라벨(10)

const fmtNum = (v: number) => v.toLocaleString('ko-KR')
const fmtChannel = (v: number, fmt: CellFormat) => (fmt === 'pct' ? `${v}%` : fmtNum(v))
const fmtSummary = (v: number, fmt: SummaryFormat) => (fmt === 'pct1' ? `${v.toFixed(1)}%` : fmtNum(v))

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

const now = new Date()
const CURRENT_MONTH = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

function periodRange(period: string): { from: string; to: string; lastDay: number } {
  const y = Number(period.slice(0, 4))
  const m = Number(period.slice(5, 7))
  const daysInMonth = new Date(y, m, 0).getDate()
  const isCurrent = now.getFullYear() === y && now.getMonth() + 1 === m
  const lastDay = isCurrent ? Math.max(1, Math.min(daysInMonth, now.getDate() - 1)) : daysInMonth
  return { from: `${period}-01`, to: `${period}-${String(lastDay).padStart(2, '0')}`, lastDay }
}

/** rowSpan2 헤더 셀(중간행에서 3행까지 내려 차지). */
function MidLeafTh({ col }: { col: CataractColumnMeta }) {
  return (
    <th
      rowSpan={2}
      className={`${groupHead} ${stickyRow2} ${headBottom} bg-white font-medium ${col.emphasis ? 'text-rose-600' : 'text-slate-700'}`}
    >
      <ColLabel label={col.label} />
    </th>
  )
}

export function ReservationStatsCataractPage() {
  const [draftMonth, setDraftMonth] = useState(DEFAULT_PERIOD)
  const [appliedMonth, setAppliedMonth] = useState(DEFAULT_PERIOD)
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [hasSearched, setHasSearched] = useState(false)

  const { from, to, lastDay } = periodRange(appliedMonth)
  const { dailies, isLoading, isError } = useReservationStatsCataract(from, to, hasSearched)
  const live = Boolean(dailies && !isError)
  const rows = !hasSearched
    ? []
    : live
      ? getDisplayRowsFromCounts(granularity, dailies!, appliedMonth, lastDay)
      : getDisplayRows(granularity, appliedMonth)
  const hasData = rows.length > 0

  const { isLocked, fillSnapshot, isFilling } = useReservationStatsCataractSnapshots()
  const lockedDraft = isLocked(draftMonth) // 호출 대상(선택 월) 잠금 여부
  // 호출(증분 채움): 선택 월을 D-1까지 비어있는 날만 라이브 적재 → 적용·표시. (인입콜·TM·노안은 0)
  const handleFill = async () => {
    if (lockedDraft) return
    try {
      await fillSnapshot(draftMonth)
      setAppliedMonth(draftMonth)
      setHasSearched(true)
    } catch (e) {
      alert(`호출 실패: ${e instanceof Error ? e.message : ''}`)
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

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden p-1 text-xs text-gray-800">
      <ReservationStatsToolbar
        draftMonth={draftMonth}
        onDraftMonthChange={setDraftMonth}
        maxMonth={CURRENT_MONTH}
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
          <thead>
            {/* 1행: 최상위 그룹 */}
            <tr>
              <th rowSpan={3} className={`${groupHead} ${leftDivider} ${headBottom} ${stickyCorner} bg-slate-100`}>
                {monthShortLabel(appliedMonth)}
                <br />
                Date
              </th>
              <th colSpan={3} className={`${groupHead} ${stickyRow1} ${headH} bg-sky-200`}>
                총 예약 (아웃바운드 포함)
              </th>
              <th colSpan={8} className={`${groupHead} ${stickyRow1} ${headH} bg-amber-100`}>
                인바운드 (컨택센터)
              </th>
              <th colSpan={6} className={`${groupHead} ${stickyRow1} ${headH} bg-amber-200`}>
                아웃바운드 (TM)
              </th>
              <th colSpan={3} className={`${groupHead} ${stickyRow1} ${headH} bg-sky-100`}>
                채팅 (카카오톡)
              </th>
              <th colSpan={2} className={`${groupHead} ${stickyRow1} ${headH} bg-emerald-100`}>
                온라인예약
              </th>
              <th colSpan={3} className={`${groupHead} ${stickyRow1} ${headH} bg-slate-100`}>
                취소
              </th>
              <th colSpan={7} className={`${groupHead} ${stickyRow1} ${headH} ${divider} bg-emerald-200`}>
                예약 종합 (내원 · 부도 · 취소)
              </th>
            </tr>
            {/* 2행: 중간 그룹/밴드 + rowSpan2 라벨 */}
            <tr>
              {/* 총예약: 백내장·노안·합계 */}
              {TOTAL_COLS.map((col) => (
                <th key={col.key} rowSpan={2} className={`${groupHead} ${stickyRow2} ${headBottom} bg-sky-50 font-semibold text-sky-800`}>
                  <ColLabel label={col.label} />
                </th>
              ))}
              {/* 인바운드: 총인입콜·응대콜·응대율(rowSpan2) + 백내장 밴드 */}
              {INBOUND_PLAIN.map((col) => (
                <MidLeafTh key={col.key} col={col} />
              ))}
              <th colSpan={5} className={`${groupHead} ${stickyRow2} ${headH} bg-rose-50 text-rose-700`}>
                백내장
              </th>
              {/* 아웃바운드: 백내장 밴드 + 아웃바운드 총 예약수(rowSpan2) */}
              <th colSpan={5} className={`${groupHead} ${stickyRow2} ${headH} bg-rose-50 text-rose-700`}>
                백내장
              </th>
              {OUTBOUND_TAIL.map((col) => (
                <MidLeafTh key={col.key} col={col} />
              ))}
              {/* 채팅 */}
              {KAKAO_COLS.map((col) => (
                <MidLeafTh key={col.key} col={col} />
              ))}
              {/* 온라인예약 */}
              {ONLINE_COLS.map((col) => (
                <MidLeafTh key={col.key} col={col} />
              ))}
              {/* 취소 */}
              {CANCEL_COLS.map((col) => (
                <MidLeafTh key={col.key} col={col} />
              ))}
              {/* 종합 */}
              {SUMMARY_COLUMNS.map((col, i) => (
                <th
                  key={col.key}
                  rowSpan={2}
                  className={`${groupHead} ${stickyRow2} ${headBottom} ${i === 0 ? divider : ''} ${
                    col.emphasis ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100'
                  }`}
                >
                  <ColLabel label={col.label} />
                </th>
              ))}
            </tr>
            {/* 3행: 백내장 밴드 하위 라벨(인바운드 5 + 아웃바운드 5) */}
            <tr>
              {ROW3_LEAVES.map((col) => (
                <th
                  key={col.key}
                  className={`${groupHead} ${stickyRow3} ${headBottom} bg-white font-medium ${col.emphasis ? 'text-rose-600' : 'text-slate-700'}`}
                >
                  <ColLabel label={col.label} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!hasSearched ? (
              <tr>
                <td colSpan={TOTAL_COL_SPAN} className={`${labelCell} bg-white py-12 text-sm text-muted-foreground`}>
                  기준 월을 선택하고 <span className="font-semibold text-slate-700">조회</span> 버튼을 눌러 데이터를 불러오세요.
                </td>
              </tr>
            ) : isLoading ? (
              <SkeletonRows />
            ) : hasData ? (
              rows.map((row) => <BodyRow key={`${granularity}-${row.label}`} row={row} />)
            ) : (
              <tr>
                <td colSpan={TOTAL_COL_SPAN} className={`${labelCell} bg-white py-8 text-sm text-muted-foreground`}>
                  {monthFullLabel(appliedMonth)} 조회 결과가 없습니다.
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
            {fmtChannel(channel[col.key], col.fmt)}
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
            {fmtSummary(summary[col.key], col.fmt)}
          </td>
        ),
      )}
    </tr>
  )
}
