import { useState } from 'react'
import { downloadCsv } from '@/utils/csv'
import {
  useReservationStatsSystem,
  useReservationStatsSnapshots,
} from '@/hooks/reservation/useReservationStatsSystem'
import { ReservationStatsToolbar } from './ReservationStatsToolbar'
import {
  CANCEL_COLUMNS,
  CHANNEL_COLUMNS,
  CHANNEL_COLUMNS_MAIN,
  DEFAULT_PERIOD,
  GRANULARITIES,
  SUMMARY_COLUMNS,
  buildReservationStatsCsv,
  getDisplayRows,
  getDisplayRowsFromCounts,
  monthFullLabel,
  monthShortLabel,
  type CellFormat,
  type DisplayRow,
  type Granularity,
  type SummaryFormat,
} from './reservationStatsSystemData'

/**
 * 예약통계시스템 — 콜/온라인/채팅/취소 채널과 내원·부도·취소 종합을 한 줄(가로 스크롤) 표로 묶은 월간 종합표.
 * 분리된 툴바(ReservationStatsToolbar)에서 월 선택·조회·초기화·CSV를 처리하고, 조회 단위(월/주/일/전체)는 즉시 전환된다.
 * 데이터는 2026-03 시드값이며 일별 행은 주별 값을 영업일에 분배해 파생한다(라이브 집계는 후속 과제).
 */

const TOTAL_COL_SPAN = 2 + CHANNEL_COLUMNS.length + SUMMARY_COLUMNS.length // 구분 + 총예약 + 채널 + 종합

const fmtNum = (v: number) => v.toLocaleString('ko-KR')
const fmtChannel = (v: number, fmt: CellFormat) => (fmt === 'pct' ? `${v}%` : fmtNum(v))
const fmtSummary = (v: number, fmt: SummaryFormat) => (fmt === 'pct1' ? `${v.toFixed(1)}%` : fmtNum(v))

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

const now = new Date()
const CURRENT_MONTH = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

/** 선택 월의 조회 범위(등록일). 진행 중인 달은 전일까지, 지난 달은 말일까지. */
function periodRange(period: string): { from: string; to: string; lastDay: number } {
  const y = Number(period.slice(0, 4))
  const m = Number(period.slice(5, 7))
  const daysInMonth = new Date(y, m, 0).getDate()
  const isCurrent = now.getFullYear() === y && now.getMonth() + 1 === m
  const lastDay = isCurrent ? Math.max(1, Math.min(daysInMonth, now.getDate() - 1)) : daysInMonth
  return { from: `${period}-01`, to: `${period}-${String(lastDay).padStart(2, '0')}`, lastDay }
}

export function ReservationStatsSystemPage() {
  const [draftMonth, setDraftMonth] = useState(DEFAULT_PERIOD)
  const [appliedMonth, setAppliedMonth] = useState(DEFAULT_PERIOD)
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [hasSearched, setHasSearched] = useState(false) // [조회] 누르기 전엔 자동 조회하지 않음

  const { from, to, lastDay } = periodRange(appliedMonth)
  const { dailies, isLoading, isError } = useReservationStatsSystem(from, to, hasSearched)
  // 조회 전에는 빈 상태. 조회 후 운영 데이터가 오면 카운트→행 계산, 미연결(503)은 시드로 폴백.
  const live = Boolean(dailies && !isError)
  const rows = !hasSearched
    ? []
    : live
      ? getDisplayRowsFromCounts(granularity, dailies!, appliedMonth, lastDay)
      : getDisplayRows(granularity, appliedMonth)
  const hasData = rows.length > 0
  const granularityLabel = GRANULARITIES.find((g) => g.key === granularity)?.label ?? ''

  const { isConfirmed, isLocked, saveSnapshot, isSaving } = useReservationStatsSnapshots()
  const confirmed = isConfirmed(appliedMonth)
  const locked = isLocked(appliedMonth) // PDF 고정(2026-01~05) — 재확정 금지
  const handleSaveSnapshot = async () => {
    if (locked) return
    try {
      await saveSnapshot(appliedMonth)
    } catch (e) {
      alert(`확정 저장 실패: ${e instanceof Error ? e.message : ''}`)
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
        maxMonth={CURRENT_MONTH}
        granularity={granularity}
        onGranularityChange={setGranularity}
        resultLabel={`${monthFullLabel(appliedMonth)} · ${granularityLabel} 조회`}
        dataStatus={!hasSearched ? 'idle' : live ? 'live' : isLoading ? 'loading' : 'seed'}
        onSearch={handleSearch}
        onReset={handleReset}
        onDownloadCsv={handleDownloadCsv}
        canDownload={hasData}
        isConfirmed={confirmed}
        isLocked={locked}
        onSaveSnapshot={handleSaveSnapshot}
        isSaving={isSaving}
        canSave={live && !locked}
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
                  <th rowSpan={3} className={`${groupHead} ${stickyRow1} ${headBottom} bg-sky-500 text-white`}>
                    총예약
                  </th>
                  <th colSpan={18} className={`${groupHead} ${stickyRow1} ${headH} bg-amber-100`}>
                    콜
                  </th>
                  <th colSpan={9} className={`${groupHead} ${stickyRow1} ${headH} bg-emerald-100`}>
                    온라인 예약
                  </th>
                  <th colSpan={3} className={`${groupHead} ${stickyRow1} ${headH} bg-sky-100`}>
                    채팅
                  </th>
                  <th colSpan={3} className={`${groupHead} ${stickyRow1} ${headH} bg-slate-100`}>
                    취소
                  </th>
                  <th colSpan={7} className={`${groupHead} ${stickyRow1} ${headH} ${divider} bg-emerald-200`}>
                    예약 종합 (내원 · 부도 · 취소)
                  </th>
                </tr>
                {/* 2행: 중간 그룹 */}
                <tr>
                  <th colSpan={8} className={`${groupHead} ${stickyRow2} ${headH} bg-amber-50`}>
                    검사 인입콜
                  </th>
                  <th colSpan={10} className={`${groupHead} ${stickyRow2} ${headH} bg-amber-50`}>
                    TM
                  </th>
                  <th colSpan={3} className={`${groupHead} ${stickyRow2} ${headH} bg-emerald-50`}>
                    홈페이지
                  </th>
                  <th colSpan={6} className={`${groupHead} ${stickyRow2} ${headH} bg-emerald-50`}>
                    네이버
                  </th>
                  <th colSpan={3} className={`${groupHead} ${stickyRow2} ${headH} bg-sky-50`}>
                    카카오톡
                  </th>
                  {CANCEL_COLUMNS.map((col) => (
                    <th key={col.key} rowSpan={2} className={`${groupHead} ${stickyRow2} ${headBottom} bg-slate-50`}>
                      <ColLabel label={col.label} />
                    </th>
                  ))}
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
                {/* 3행: 채널 컬럼 라벨 */}
                <tr>
                  {CHANNEL_COLUMNS_MAIN.map((col) => (
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
        {muted ? <span className="text-slate-300">–</span> : fmtNum(channel.totalReservation)}
      </td>

      {CHANNEL_COLUMNS.map((col) =>
        muted ? (
          <td key={col.key} className={`${numCell} text-slate-300`}>
            –
          </td>
        ) : (
          <td key={col.key} className={`${numCell} ${col.emphasis ? 'text-rose-600' : ''}`}>
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
