import { useMemo, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { useCataractExamList } from '@/hooks/useCataractExamList'
import type { CataractExamListItem } from '@/api/cataractExamList'

/**
 * 백내장 검사자 리스트 — 성민CRM "백내장 검사자 리스트"(FrmCataract_ExamList).
 * 소스: Cataract_Exam + Cataract_Operationdata + CUSTOM + EMPLOYEE + RESERVATION(flag 'H').
 * 적절수술/수술방법 = IOL 렌즈명, 진료구분 = C_OP전검사 등. docs/db/백내장검사리스트-컬럼정의.md.
 */

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
  groupStart?: boolean
  render?: (r: CataractExamListItem) => ReactNode
}

const COLUMNS: Column[] = [
  { key: 'examDate', label: '검사일', align: 'center', min: '6rem', groupStart: true },
  { key: 'examType', label: '진료구분', align: 'center', min: '6rem', render: (r) => <Badge text={r.examType} className="bg-sky-50 text-sky-700" /> },
  { key: 'examTime', label: '검사시간', align: 'center', min: '4.5rem' },
  { key: 'chartNo', label: '차트번호', align: 'center', min: '6rem', groupStart: true },
  { key: 'name', label: '고객명', align: 'center', min: '5rem', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
  { key: 'grade', label: '등급', align: 'center', min: '3.5rem', render: (r) => <Badge text={r.grade} className={GRADE_STYLE[r.grade]} /> },
  { key: 'birth', label: '생년월일', align: 'center', min: '6rem' },
  { key: 'age', label: '만나이', align: 'right', min: '3.5rem', render: (r) => calcAge(r.birth) },
  { key: 'phone2', label: '휴대전화', align: 'left', min: '8rem' },
  { key: 'counselor', label: '상담사', align: 'center', min: '5rem', groupStart: true },
  { key: 'doctor', label: '상담의', align: 'center', min: '5rem' },
  { key: 'optometrist', label: '검안사', align: 'center', min: '5rem' },
  { key: 'recommendedR', label: '적절IOL(R)', align: 'left', min: '9rem', groupStart: true, render: (r) => truncate(r.recommendedR, '9rem') },
  { key: 'recommendedL', label: '적절IOL(L)', align: 'left', min: '9rem', render: (r) => truncate(r.recommendedL, '9rem') },
  { key: 'surgeryR', label: '수술IOL(R)', align: 'left', min: '9rem', render: (r) => truncate(r.surgeryR, '9rem') },
  { key: 'surgeryL', label: '수술IOL(L)', align: 'left', min: '9rem', render: (r) => truncate(r.surgeryL, '9rem') },
  { key: 'surgeryReserveDate', label: '수술예약일', align: 'center', min: '6rem', render: (r) => dash(r.surgeryReserveDate) },
  { key: 'surgeryDate', label: '수술일', align: 'center', min: '6rem', render: (r) => dash(r.surgeryDate) },
  { key: 'surgeon', label: '집도의', align: 'center', min: '5rem', render: (r) => dash(r.surgeon) },
  { key: 'estimate', label: '견적가', align: 'left', min: '10rem', groupStart: true, render: (r) => truncate(r.estimate, '10rem') },
  { key: 'payment', label: '수납금액', align: 'right', min: '6rem', render: (r) => <span className="tabular-nums">{dash(r.payment)}</span> },
  { key: 'surgeryRate', label: '영업가율', align: 'center', min: '4.5rem', render: (r) => dash(r.surgeryRate) },
  { key: 'opImpossible', label: '수술불가', align: 'center', min: '4rem', render: (r) => <YN v={r.opImpossible} /> },
  { key: 'examStop', label: '검사중단', align: 'center', min: '4rem', render: (r) => <YN v={r.examStop} /> },
  { key: 'cancelCode', label: '취소사유', align: 'center', min: '4.5rem', render: (r) => dash(r.cancelCode) },
  { key: 'route', label: '예약경로', align: 'center', min: '5rem', groupStart: true, render: (r) => dash(r.route) },
  { key: 'motiveL', label: '내원동기(대)', align: 'center', min: '6rem', render: (r) => dash(r.motiveL) },
  { key: 'motiveM', label: '내원동기(중)', align: 'center', min: '6rem', render: (r) => dash(r.motiveM) },
  { key: 'insurance', label: '실손보험', align: 'center', min: '4.5rem', render: (r) => dash(r.insurance) },
  { key: 'job', label: '직업', align: 'center', min: '6rem', groupStart: true },
  { key: 'nationality', label: '국적', align: 'center', min: '4.5rem' },
  { key: 'email', label: '이메일', align: 'left', min: '10rem', render: (r) => truncate(r.email, '11rem') },
  { key: 'addr1', label: '주소1', align: 'left', min: '12rem', render: (r) => truncate(r.addr1, '14rem') },
  { key: 'lastVisit', label: '최근내원일', align: 'center', min: '6rem' },
  { key: 'examMemo', label: '검사특이사항', align: 'left', min: '16rem', render: (r) => truncate(r.examMemo, '18rem') },
  { key: 'memo', label: '고객메모', align: 'left', min: '12rem', render: (r) => truncate(r.memo, '14rem') },
]

const ALIGN: Record<NonNullable<Column['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right tabular-nums',
}

export function CataractExamListPage() {
  const [from, setFrom] = useState('2026-04-01')
  const [to, setTo] = useState('2026-04-30')
  const [type, setType] = useState('전체')
  const [keyword, setKeyword] = useState('')

  const { rows, isLoading, isError } = useCataractExamList(from, to)

  const typeOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.examType).filter(Boolean))
    return ['전체', ...[...set].sort()]
  }, [rows])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return rows.filter((r) => {
      if (type !== '전체' && r.examType !== type) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.chartNo.includes(q) || r.phone2.includes(q)
    })
  }, [rows, type, keyword])

  return (
    <div className="space-y-6">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>백내장 검사자 리스트</CardTitle>
              <CardDescription>
                총 <span className="font-semibold text-gray-700">{filtered.length.toLocaleString()}</span>건
                <span className="ml-1 text-muted-foreground">(성민CRM 백내장 검사자 리스트 · IOL 기준)</span>
              </CardDescription>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <span className="text-muted-foreground">검사기간</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="h-9 rounded-lg border border-border/70 bg-white px-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              <span className="text-gray-400">~</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-lg border border-border/70 bg-white px-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="h-9 rounded-lg border border-border/70 bg-white px-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
              {typeOptions.map((t) => <option key={t} value={t}>{t === '전체' ? '진료구분 전체' : t}</option>)}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                placeholder="고객명 · 차트번호 · 연락처"
                className="h-9 w-56 rounded-lg border border-border/70 bg-white pl-8 pr-3 text-sm outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="px-3 py-16 text-center text-sm text-red-500">데이터를 불러오지 못했습니다.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    {COLUMNS.map((col) => (
                      <th key={col.key}
                        className={`sticky top-0 z-10 whitespace-nowrap border-b border-border/60 bg-gray-50 px-3 py-2.5 font-medium ${ALIGN[col.align ?? 'left']} ${col.groupStart ? 'border-l border-border/60' : ''}`}
                        style={{ minWidth: col.min }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr key={`${row.chartNo}-${i}`} className="border-b border-border/40 transition-colors hover:bg-blue-50/40">
                      {COLUMNS.map((col) => (
                        <td key={col.key}
                          className={`whitespace-nowrap px-3 py-2 text-gray-700 ${ALIGN[col.align ?? 'left']} ${col.groupStart ? 'border-l border-border/40' : ''}`}
                          style={{ minWidth: col.min }}>
                          {col.render ? col.render(row) : dash(String(row[col.key as keyof CataractExamListItem] ?? ''))}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!isLoading && filtered.length === 0 && (
                    <tr><td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</td></tr>
                  )}
                  {isLoading && (
                    <tr><td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-sm text-muted-foreground">불러오는 중…</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
