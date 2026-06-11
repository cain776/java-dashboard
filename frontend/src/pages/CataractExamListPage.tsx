import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCataractExamList } from '@/hooks/useCataractExamList'
import type { CataractExamListItem } from '@/api/cataractExamList'

const dash = (v: string) => (v && v.trim() ? v : '—')

const calcAge = (birth: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(birth)) return '—'
  const b = new Date(birth)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1
  return age >= 0 && age < 130 ? String(age) : '—'
}

const EXAM_TYPE_STYLE: Record<string, string> = {
  백내장검사: 'bg-amber-50 text-amber-700',
  'C_OP전검사': 'bg-amber-50 text-amber-700',
  'Cataract OP': 'bg-amber-50 text-amber-700',
}
const PATIENT_TYPE_STYLE: Record<string, string> = {
  신환: 'bg-emerald-50 text-emerald-700',
  구환: 'bg-gray-100 text-gray-700',
}
const GRADE_STYLE: Record<string, string> = {
  R: 'bg-emerald-50 text-emerald-700',
  A: 'bg-blue-50 text-blue-700',
  B: 'bg-amber-50 text-amber-700',
  C: 'bg-gray-100 text-gray-600',
  G: 'bg-gray-100 text-gray-500',
}

const Badge = ({ text, className }: { text: string; className?: string }) =>
  text ? (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${className ?? 'bg-gray-100 text-gray-600'}`}>{text}</span>
  ) : (
    <span className="text-gray-300">—</span>
  )

const YN = ({ v }: { v: string }) =>
  v === 'Y' ? <span className="font-medium text-red-500">Y</span> : <span className="text-gray-300">—</span>

const truncate = (v: string, w = '14rem') => (
  <span className="block truncate text-gray-700" style={{ maxWidth: w }} title={v}>{dash(v)}</span>
)

interface Column {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  min?: string
  render?: (r: CataractExamListItem, rowNumber: number) => ReactNode
}

type PeriodMode = 'daily' | 'monthly'
type QuickRangeKey = '1w' | '2w' | '3w' | '4w' | 'monthly'
type SortDirection = 'asc' | 'desc'
type SortState = { key: string; direction: SortDirection } | null

const DEFAULT_FROM = '2026-04-01'
const DEFAULT_TO = '2026-04-30'
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]
const SKELETON_ROWS = 50
const QUICK_RANGES: Array<{ key: QuickRangeKey; label: string }> = [
  { key: '1w', label: '1주' },
  { key: '2w', label: '2주' },
  { key: '3w', label: '3주' },
  { key: '4w', label: '4주' },
  { key: 'monthly', label: '월별' },
]

const COLUMNS: Column[] = [
  { key: 'rowNo', label: 'No', align: 'right', min: '3.5rem', render: (_r, rowNumber) => rowNumber.toLocaleString('ko-KR') },
  { key: 'examDate', label: '검사일', align: 'center', min: '6rem' },
  { key: 'patientType', label: '신/구환', align: 'center', min: '4.5rem', render: (r) => <Badge text={r.patientType} className={PATIENT_TYPE_STYLE[r.patientType]} /> },
  { key: 'examType', label: '진료구분', align: 'center', min: '6rem', render: (r) => <Badge text={r.examType} className={EXAM_TYPE_STYLE[r.examType]} /> },
  { key: 'examTime', label: '검사시간', align: 'center', min: '4.5rem' },
  { key: 'chartNo', label: '차트번호', align: 'center', min: '6rem' },
  { key: 'name', label: '고객명', align: 'center', min: '5rem', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
  { key: 'nameEng', label: '고객명(영)', align: 'left', min: '7rem' },
  { key: 'grade', label: '등급', align: 'center', min: '3.5rem', render: (r) => <Badge text={r.grade} className={GRADE_STYLE[r.grade]} /> },
  { key: 'birth', label: '생년월일', align: 'center', min: '6rem' },
  { key: 'age', label: '만나이', align: 'right', min: '3.5rem', render: (r) => calcAge(r.birth) },
  { key: 'lunar', label: '양/음', align: 'center', min: '3.5rem' },
  { key: 'phone2', label: '휴대전화', align: 'left', min: '8rem' },
  { key: 'phone1', label: '집전화', align: 'left', min: '7rem' },
  { key: 'email', label: '이메일', align: 'left', min: '10rem', render: (r) => truncate(r.email, '11rem') },
  { key: 'counselor', label: '상담사', align: 'center', min: '5rem' },
  { key: 'doctor', label: '상담의', align: 'center', min: '5rem' },
  { key: 'optometrist', label: '검안사', align: 'center', min: '5rem' },
  { key: 'recommendedR', label: '적절IOL(R)', align: 'left', min: '9rem', render: (r) => truncate(r.recommendedR, '9rem') },
  { key: 'recommendedL', label: '적절IOL(L)', align: 'left', min: '9rem', render: (r) => truncate(r.recommendedL, '9rem') },
  { key: 'surgeryReserveDate', label: '수술예약일', align: 'center', min: '6rem', render: (r) => dash(r.surgeryReserveDate) },
  { key: 'surgeryDate', label: '수술일', align: 'center', min: '6rem', render: (r) => dash(r.surgeryDate) },
  { key: 'surgeryR', label: '수술IOL(R)', align: 'left', min: '9rem', render: (r) => truncate(r.surgeryR, '9rem') },
  { key: 'surgeryL', label: '수술IOL(L)', align: 'left', min: '9rem', render: (r) => truncate(r.surgeryL, '9rem') },
  { key: 'surgeon', label: '집도의', align: 'center', min: '5rem', render: (r) => dash(r.surgeon) },
  { key: 'estimate', label: '견적가', align: 'left', min: '10rem', render: (r) => truncate(r.estimate, '10rem') },
  { key: 'surgeryRate', label: '영업가율', align: 'center', min: '4.5rem', render: (r) => dash(r.surgeryRate) },
  { key: 'payment', label: '수납금액', align: 'right', min: '6rem', render: (r) => <span className="tabular-nums">{dash(r.payment)}</span> },
  { key: 'opImpossible', label: '수술불가', align: 'center', min: '4rem', render: (r) => <YN v={r.opImpossible} /> },
  { key: 'examStop', label: '검사중단', align: 'center', min: '4rem', render: (r) => <YN v={r.examStop} /> },
  { key: 'cancelCode', label: '취소사유', align: 'center', min: '4.5rem', render: (r) => dash(r.cancelCode) },
  { key: 'cancelMemo', label: '취소메모', align: 'left', min: '8rem', render: (r) => truncate(r.cancelMemo, '8rem') },
  { key: 'route', label: '예약경로', align: 'center', min: '5rem', render: (r) => dash(r.route) },
  { key: 'section', label: '섹션', align: 'center', min: '3.5rem', render: (r) => dash(r.section) },
  { key: 'motiveL', label: '내원동기(대)', align: 'center', min: '6rem', render: (r) => dash(r.motiveL) },
  { key: 'motiveM', label: '내원동기(중)', align: 'center', min: '6rem', render: (r) => dash(r.motiveM) },
  { key: 'motiveS', label: '내원동기(세)', align: 'center', min: '6rem', render: (r) => dash(r.motiveS) },
  { key: 'motiveMemo', label: '동기메모', align: 'left', min: '7rem', render: (r) => truncate(r.motiveMemo, '7rem') },
  { key: 'job', label: '직업', align: 'center', min: '6rem' },
  { key: 'nationality', label: '국적', align: 'center', min: '4.5rem' },
  { key: 'insurance', label: '보험사', align: 'center', min: '4.5rem' },
  { key: 'jumin', label: '주민번호', align: 'center', min: '8rem' },
  { key: 'zip', label: '우편번호', align: 'center', min: '4.5rem' },
  { key: 'addr1', label: '주소1', align: 'left', min: '12rem', render: (r) => truncate(r.addr1, '14rem') },
  { key: 'addr2', label: '주소2', align: 'left', min: '8rem', render: (r) => truncate(r.addr2, '9rem') },
  { key: 'examRegDate', label: '검사예약등록일', align: 'center', min: '6rem', render: (r) => dash(r.examRegDate) },
  { key: 'surgeryRegDate', label: '수술예약등록일', align: 'center', min: '6rem', render: (r) => dash(r.surgeryRegDate) },
  { key: 'lastVisit', label: '최근내원일', align: 'center', min: '6rem' },
  { key: 'examMemo', label: '검사특이사항', align: 'left', min: '16rem', render: (r) => truncate(r.examMemo, '18rem') },
  { key: 'memo', label: '고객메모', align: 'left', min: '12rem', render: (r) => truncate(r.memo, '14rem') },
]

const ALIGN: Record<NonNullable<Column['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right tabular-nums',
}
const HEADER_ALIGN: Record<NonNullable<Column['align']>, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
}

const formatCount = (count: number) => count.toLocaleString('ko-KR')
const toMonthValue = (date: string) => date.slice(0, 7)
const toMonthStart = (month: string) => `${month}-01`
const toMonthEnd = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDate = new Date(year, monthNumber, 0).getDate()
  return `${month}-${String(lastDate).padStart(2, '0')}`
}
const toMonthWeekRange = (month: string, week: number) => {
  const startDay = ((week - 1) * 7) + 1
  const monthEnd = toMonthEnd(month)
  const lastDay = Number(monthEnd.slice(-2))
  const endDay = week === 4 ? lastDay : Math.min(startDay + 6, lastDay)
  return {
    from: `${month}-${String(startDay).padStart(2, '0')}`,
    to: `${month}-${String(endDay).padStart(2, '0')}`,
  }
}

const buildPaginationItems = (currentPage: number, pageMax: number): Array<number | string> => {
  if (pageMax <= 7) return Array.from({ length: pageMax }, (_, index) => index + 1)

  const pages = new Set([1, pageMax, currentPage - 1, currentPage, currentPage + 1])
  const normalized = [...pages].filter((page) => page >= 1 && page <= pageMax).sort((a, b) => a - b)

  return normalized.reduce<Array<number | string>>((items, page, index) => {
    const prev = normalized[index - 1]
    if (prev && page - prev > 1) items.push(`ellipsis-${prev}-${page}`)
    items.push(page)
    return items
  }, [])
}

const getSortValue = (row: CataractExamListItem, key: string, originalIndex: number) => {
  if (key === 'rowNo') return originalIndex
  if (key === 'age') {
    const age = Number(calcAge(row.birth))
    return Number.isFinite(age) ? age : null
  }
  return String(row[key as keyof CataractExamListItem] ?? '').trim()
}

const compareSortValue = (a: string | number | null, b: string | number | null) => {
  const aEmpty = a === null || a === ''
  const bEmpty = b === null || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'ko-KR', { numeric: true, sensitivity: 'base' })
}

export function CataractExamListPage() {
  const [draftPeriodMode, setDraftPeriodMode] = useState<PeriodMode>('daily')
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRangeKey | null>(null)
  const [draftFrom, setDraftFrom] = useState(DEFAULT_FROM)
  const [draftTo, setDraftTo] = useState(DEFAULT_TO)
  const [draftType, setDraftType] = useState('전체')
  const [draftKeyword, setDraftKeyword] = useState('')
  const [queryFrom, setQueryFrom] = useState(DEFAULT_FROM)
  const [queryTo, setQueryTo] = useState(DEFAULT_TO)
  const [queryType, setQueryType] = useState('전체')
  const [queryKeyword, setQueryKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortState, setSortState] = useState<SortState>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const { rows, isLoading, isFetching, isError } = useCataractExamList(queryFrom, queryTo, hasSearched)
  const showSkeleton = hasSearched && (isLoading || isFetching)

  const typeOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.examType).filter(Boolean))
    return ['전체', ...[...set].sort()]
  }, [rows])

  const filtered = useMemo(() => {
    const q = queryKeyword.trim().toLowerCase()
    return rows.filter((r) => {
      if (queryType !== '전체' && r.examType !== queryType) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.chartNo.includes(q) || r.phone2.includes(q)
    })
  }, [rows, queryType, queryKeyword])

  const sortedRows = useMemo(() => {
    if (!sortState) return filtered
    return filtered
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const compared = compareSortValue(
          getSortValue(a.row, sortState.key, a.index),
          getSortValue(b.row, sortState.key, b.index),
        )
        if (compared !== 0) return sortState.direction === 'asc' ? compared : -compared
        return a.index - b.index
      })
      .map(({ row }) => row)
  }, [filtered, sortState])

  const pageMax = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, pageMax)
  const paginationItems = useMemo(() => buildPaginationItems(safePage, pageMax), [safePage, pageMax])
  const visibleRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [safePage, sortedRows, pageSize])
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, filtered.length)
  const dateInputType = draftPeriodMode === 'monthly' ? 'month' : 'date'
  const fromInputValue = draftPeriodMode === 'monthly' ? toMonthValue(draftFrom) : draftFrom
  const toInputValue = draftPeriodMode === 'monthly' ? toMonthValue(draftTo) : draftTo
  const visibleQuickRanges = draftPeriodMode === 'daily' ? QUICK_RANGES : []

  const handleSearch = () => {
    setHasSearched(true)
    setCurrentPage(1)
    setQueryFrom(draftPeriodMode === 'monthly' ? toMonthStart(toMonthValue(draftFrom)) : draftFrom)
    setQueryTo(draftPeriodMode === 'monthly' ? toMonthEnd(toMonthValue(draftTo)) : draftTo)
    setQueryType(draftType)
    setQueryKeyword(draftKeyword)
  }

  // F1 단축키로 조회 실행 (성민CRM 검사자 리스트와 동일). 최신 draft 상태를 ref로 참조.
  const handleSearchRef = useRef(handleSearch)
  useEffect(() => {
    handleSearchRef.current = handleSearch
  })
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        handleSearchRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleReset = () => {
    setDraftPeriodMode('daily')
    setActiveQuickRange(null)
    setDraftFrom(DEFAULT_FROM)
    setDraftTo(DEFAULT_TO)
    setDraftType('전체')
    setDraftKeyword('')
    setQueryFrom(DEFAULT_FROM)
    setQueryTo(DEFAULT_TO)
    setQueryType('전체')
    setQueryKeyword('')
    setPageSize(50)
    setCurrentPage(1)
    setSortState(null)
    setHasSearched(false)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), pageMax))
  }

  const handleSort = (key: string) => {
    setCurrentPage(1)
    setSortState((prev) => (
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ))
  }

  const handlePeriodModeChange = (mode: PeriodMode) => {
    setDraftPeriodMode(mode)
    setActiveQuickRange(null)
    if (mode === 'monthly') {
      setDraftFrom(toMonthStart(toMonthValue(draftFrom)))
      setDraftTo(toMonthEnd(toMonthValue(draftTo)))
    }
  }

  const handleQuickRange = (key: QuickRangeKey) => {
    setActiveQuickRange(key)
    if (key === 'monthly') {
      setDraftPeriodMode('daily')
      setDraftFrom(toMonthStart(toMonthValue(draftFrom)))
      setDraftTo(toMonthEnd(toMonthValue(draftTo)))
      return
    }
    const week = Number(key.replace('w', ''))
    const { from, to } = toMonthWeekRange(toMonthValue(draftFrom), week)
    setDraftPeriodMode('daily')
    setDraftFrom(from)
    setDraftTo(to)
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/70 bg-white px-1.5 py-1 text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-1 text-xs text-gray-700">
          <div className="relative">
            <select
              aria-label="기간 단위"
              value={draftPeriodMode}
              onChange={(e) => handlePeriodModeChange(e.target.value as PeriodMode)}
              className="h-8 w-20 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="daily">일별</option>
              <option value="monthly">월별</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
          <input
            aria-label="백내장 검사 시작일"
            type={dateInputType}
            value={fromInputValue}
            onChange={(e) => {
              setActiveQuickRange(null)
              setDraftFrom(draftPeriodMode === 'monthly' ? toMonthStart(e.target.value) : e.target.value)
            }}
            className="h-8 w-[8.2rem] rounded-md border border-border/80 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <span className="text-gray-400">~</span>
          <input
            aria-label="백내장 검사 종료일"
            type={dateInputType}
            value={toInputValue}
            onChange={(e) => {
              setActiveQuickRange(null)
              setDraftTo(draftPeriodMode === 'monthly' ? toMonthEnd(e.target.value) : e.target.value)
            }}
            className="h-8 w-[8.2rem] rounded-md border border-border/80 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {visibleQuickRanges.length > 0 && (
          <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white">
            {visibleQuickRanges.map((range, index) => (
              <button
                key={range.key}
                type="button"
                className={`min-w-10 border-l border-border/70 px-2 text-xs font-medium transition-colors first:border-l-0 ${
                  activeQuickRange === range.key
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
                } ${index === visibleQuickRanges.length - 1 ? 'min-w-12' : ''}`}
                onClick={() => handleQuickRange(range.key)}
              >
                {range.label}
              </button>
            ))}
          </div>
        )}
        <div className="h-6 w-px bg-border" />
        <div className="relative">
          <select
            aria-label="진료구분"
            value={draftType}
            onChange={(e) => setDraftType(e.target.value)}
            className="h-8 w-36 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {typeOptions.map((t) => <option key={t} value={t}>{t === '전체' ? '진료구분 전체' : t}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        </div>
        <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            type="text"
            value={draftKeyword}
            onChange={(e) => setDraftKeyword(e.target.value)}
            placeholder="고객명 · 차트번호 · 연락처"
            className="h-full w-[15.1rem] border-0 bg-white px-3 text-xs outline-none placeholder:text-gray-400"
          />
        </div>
        <div className="flex h-8 items-center gap-2 rounded-md border border-border/80 bg-white px-3 text-xs" aria-live="polite">
          <span className="text-muted-foreground">조회건수</span>
          <strong className="tabular-nums text-gray-900">{formatCount(filtered.length)}건</strong>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            초기화
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isLoading}
            className="bg-blue-600 text-xs text-white hover:bg-blue-700"
            onClick={handleSearch}
          >
            <Search className="h-3.5 w-3.5" />
            조회 (F1)
          </Button>
        </div>
      </div>

      <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          {isError ? (
            <div className="flex flex-1 items-center justify-center px-3 text-sm text-red-500">데이터를 불러오지 못했습니다.</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-50 text-[11px] text-gray-700">
                    {COLUMNS.map((col) => {
                      const activeDirection = sortState?.key === col.key ? sortState.direction : null
                      return (
                        <th
                          key={col.key}
                          aria-sort={activeDirection === 'asc' ? 'ascending' : activeDirection === 'desc' ? 'descending' : 'none'}
                          className={`sticky top-0 z-10 whitespace-nowrap border-b border-border/60 bg-gray-50 px-2.5 py-1.5 font-semibold ${ALIGN[col.align ?? 'left']}`}
                          style={{ minWidth: col.min }}
                        >
                          <button
                            type="button"
                            className={`inline-flex w-full items-center gap-1 text-[11px] font-semibold text-gray-800 transition-colors hover:text-blue-700 focus-visible:outline-none ${HEADER_ALIGN[col.align ?? 'left']}`}
                            onClick={() => handleSort(col.key)}
                          >
                            <span>{col.label}</span>
                            <span className="flex h-3.5 w-2.5 flex-col items-center justify-center gap-[1px]" aria-hidden="true">
                              <span className={`h-0 w-0 border-x-[3.5px] border-b-[4px] border-x-transparent ${activeDirection === 'asc' ? 'border-b-blue-600' : 'border-b-gray-300'}`} />
                              <span className={`h-0 w-0 border-x-[3.5px] border-t-[4px] border-x-transparent ${activeDirection === 'desc' ? 'border-t-blue-600' : 'border-t-gray-300'}`} />
                            </span>
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {showSkeleton && Array.from({ length: Math.max(pageSize, SKELETON_ROWS) }, (_, rowIndex) => (
                    <tr key={`cataract-exam-list-skeleton-${rowIndex}`} className="border-b border-border/40">
                      {COLUMNS.map((col) => (
                        <td key={col.key} className="whitespace-nowrap px-2.5 py-1" style={{ minWidth: col.min }}>
                          <span className="exam-skeleton-bar block h-2.5 w-full rounded" />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!showSkeleton && visibleRows.map((row, i) => {
                    const rowNumber = (safePage - 1) * pageSize + i + 1
                    return (
                      <tr key={`${row.chartNo}-${row.examDate}-${i}`} className="border-b border-border/40 transition-colors hover:bg-blue-50/40">
                        {COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className={`whitespace-nowrap px-2.5 py-1 text-[11px] text-gray-800 ${ALIGN[col.align ?? 'left']}`}
                            style={{ minWidth: col.min }}
                          >
                            {col.render ? col.render(row, rowNumber) : dash(String(row[col.key as keyof CataractExamListItem] ?? ''))}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  {!showSkeleton && filtered.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-sm text-muted-foreground">
                        {hasSearched ? '검색 결과가 없습니다.' : '조회 조건을 선택한 뒤 조회 버튼을 눌러주세요.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 rounded-b-lg bg-white px-2 py-1.5 text-xs">
            <span className="min-w-[8rem] font-semibold text-gray-800" aria-live="polite">
              {formatCount(filtered.length)}건 중 {formatCount(rangeStart)}-{formatCount(rangeEnd)}
            </span>
            <nav className="flex flex-1 items-center justify-center gap-1" aria-label="페이지 네비게이션">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={safePage <= 1}
                onClick={() => handlePageChange(safePage - 1)}
              >
                이전
              </Button>
              {paginationItems.map((item) => (
                typeof item === 'number' ? (
                  <Button
                    key={item}
                    type="button"
                    variant={item === safePage ? 'default' : 'outline'}
                    size="icon-sm"
                    className="text-xs"
                    aria-current={item === safePage ? 'page' : undefined}
                    onClick={() => handlePageChange(item)}
                  >
                    {item}
                  </Button>
                ) : (
                  <span key={item} className="px-1 text-muted-foreground">...</span>
                )
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={safePage >= pageMax}
                onClick={() => handlePageChange(safePage + 1)}
              >
                다음
              </Button>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="cataract-exam-list-page-size" className="text-muted-foreground">행 수</label>
              <div className="relative">
                <select
                  id="cataract-exam-list-page-size"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                  className="h-8 w-16 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-7 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
