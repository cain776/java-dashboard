import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSurgeryTrend } from '@/hooks/surgery/useSurgeryTrend'
import { CURRENT_YEAR, MONTHS } from '@/constants/chart'
import { formatAxisNumber } from '@/utils/stats'

const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]

interface Cell {
  lasek: number; lasik: number; smile: number; smilePro: number
  icl: number; tIcl: number; kpl: number; tKpl: number; viva: number
  catMulti: number; catMono: number; catEdof: number
  xtra: number; waveVision: number; monoVision: number; reoperation: number
  visionPatients: number; cataractPatients: number; total: number
}

const EMPTY: Cell = {
  lasek: 0, lasik: 0, smile: 0, smilePro: 0, icl: 0, tIcl: 0, kpl: 0, tKpl: 0, viva: 0,
  catMulti: 0, catMono: 0, catEdof: 0,
  xtra: 0, waveVision: 0, monoVision: 0, reoperation: 0,
  visionPatients: 0, cataractPatients: 0, total: 0,
}

const piolSum = (d: Cell) => d.icl + d.tIcl + d.kpl + d.tKpl + d.viva
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)
/** 값(비중%) — 그룹 합계 대비 */
const vp = (v: number, base: number) => (v > 0 ? `${formatAxisNumber(v)} (${pct(v, base)}%)` : '-')
const vc = (v: number) => (v > 0 ? formatAxisNumber(v) : '-')

type Tone = 'blue' | 'violet' | undefined
interface ColDef { render: (d: Cell) => string; border?: boolean; strong?: boolean; muted?: boolean; tone?: Tone }

// 본문 26개 컬럼(월 제외) — 헤더 leaf 순서와 1:1 대응. API에 없는 칼럼은 빈 문자열.
const COLS: ColDef[] = [
  { render: (d) => vc(d.total), border: true, strong: true },                            // 합계
  { render: (d) => vc(d.visionPatients), border: true, strong: true, tone: 'blue' },      // 시력교정
  { render: (d) => vp(d.smile, d.visionPatients) },                                       // 스마일
  { render: (d) => vp(d.smilePro, d.visionPatients) },                                    // 스마일프로
  { render: (d) => vp(piolSum(d), d.visionPatients), border: true, strong: true },        // PIOL 합계
  { render: (d) => vc(d.icl), muted: true },                                              // ICL
  { render: (d) => vc(d.tIcl), muted: true },                                             // T-ICL
  { render: (d) => vc(d.kpl), muted: true },                                              // KPL
  { render: (d) => vc(d.tKpl), muted: true },                                             // T-KPL
  { render: (d) => vc(d.viva), muted: true },                                             // VIVA
  { render: (d) => vp(d.lasik, d.visionPatients), border: true },                         // 라식계
  { render: (d) => vp(d.lasek, d.visionPatients), border: true, strong: true },           // 라섹계 합계
  { render: () => '' },                                                                   // 라섹계 EX
  { render: () => '' },                                                                   // 라섹계 Red
  { render: (d) => vc(d.reoperation), border: true, strong: true },                       // 재수술 합계
  { render: () => '' },                                                                   // 재수술 레이저
  { render: () => '' },                                                                   // 재수술 렌즈
  { render: (d) => vc(d.xtra), border: true },                                            // 엑스트라
  { render: () => '' },                                                                   // 퍼스널
  { render: () => '' },                                                                   // 콘트라
  { render: (d) => vc(d.waveVision) },                                                    // 웨이브비전
  { render: (d) => vc(d.monoVision) },                                                    // 모노비전
  { render: (d) => vc(d.cataractPatients), border: true, strong: true, tone: 'violet' },  // 백내장 수술수
  { render: (d) => vp(d.catMulti, d.cataractPatients) },                                  // 다초점
  { render: (d) => vp(d.catEdof, d.cataractPatients) },                                   // 프리미엄
  { render: (d) => vp(d.catMono, d.cataractPatients) },                                   // 단초점
]

const toneClass = (t: Tone) => (t === 'blue' ? 'text-blue-700' : t === 'violet' ? 'text-violet-700' : '')

function DataRow({ label, d, head }: { label: ReactNode; d: Cell; head?: boolean }) {
  return (
    <tr className={head ? 'border-t-2 border-border bg-muted/30 font-semibold' : 'border-b border-border'}>
      <td className="px-1.5 py-1.5 font-semibold">{label}</td>
      {COLS.map((c, i) => (
        <td
          key={i}
          className={`px-1.5 py-1.5 tabular-nums ${c.border ? 'border-l border-border' : ''} ${c.strong ? 'font-semibold' : ''} ${c.muted ? 'text-muted-foreground' : ''} ${toneClass(c.tone)}`}
        >
          {c.render(d)}
        </td>
      ))}
    </tr>
  )
}

export function SurgeryCompositionPage() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const { dataMap, isLoading, isError } = useSurgeryTrend([year])

  const rows = useMemo(() => {
    const arr = dataMap[year] ?? []
    return MONTHS.map((month, i) => ({ month, d: arr[i] ?? EMPTY }))
  }, [dataMap, year])

  const total = useMemo(() => {
    const t = { ...EMPTY }
    const keys = Object.keys(EMPTY) as (keyof Cell)[]
    for (const r of rows) for (const k of keys) t[k] += r.d[k]
    return t
  }, [rows])

  const selectClass =
    'h-9 appearance-none rounded-md border border-border/80 bg-white pl-3 pr-8 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
  const th = 'px-1.5 py-1 font-semibold'
  const thL = `${th} border-l border-border`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-3 py-2 shadow-sm">
        <div className="relative">
          <select aria-label="연도" value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${selectClass} w-28`}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-blue-600" />시력교정수술</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-violet-600" />백내장</span>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>수술별 비중 (시술별 · {year}년)</CardTitle>
          <CardDescription>
            월별 시술 건수와 그룹 내 비중(괄호 %)입니다. 시력교정 비중은 시력교정 합계 대비, 백내장 비중은 백내장 수술수 대비.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="flex h-40 items-center justify-center text-sm text-red-500">데이터를 불러오지 못했습니다.</div>
          ) : isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1900px] border-collapse text-center text-[10px]">
                <thead>
                  {/* 1단: 대그룹 */}
                  <tr className="border-y border-border bg-muted/40">
                    <th rowSpan={3} className={th}>월</th>
                    <th rowSpan={3} className={thL}>합계</th>
                    <th colSpan={21} className={`${thL} border-b text-blue-700`}>시력교정수술</th>
                    <th colSpan={4} className={`${thL} border-b text-violet-700`}>백내장</th>
                  </tr>
                  {/* 2단: 소그룹 / 단일컬럼 */}
                  <tr className="border-b border-border bg-muted/40">
                    <th rowSpan={2} className={thL}>시력교정</th>
                    <th rowSpan={2} className={th}>스마일</th>
                    <th rowSpan={2} className={th}>스마일프로</th>
                    <th colSpan={6} className={`${thL} border-b`}>PIOL</th>
                    <th rowSpan={2} className={thL}>라식계</th>
                    <th colSpan={3} className={`${thL} border-b`}>라섹계</th>
                    <th colSpan={3} className={`${thL} border-b`}>재수술</th>
                    <th rowSpan={2} className={thL}>엑스트라</th>
                    <th rowSpan={2} className={th}>퍼스널</th>
                    <th rowSpan={2} className={th}>콘트라</th>
                    <th rowSpan={2} className={th}>웨이브비전</th>
                    <th rowSpan={2} className={th}>모노비전</th>
                    <th rowSpan={2} className={thL}>수술수</th>
                    <th rowSpan={2} className={th}>다초점</th>
                    <th rowSpan={2} className={th}>프리미엄</th>
                    <th rowSpan={2} className={th}>단초점</th>
                  </tr>
                  {/* 3단: 소그룹 leaf */}
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    <th className={thL}>합계</th>
                    <th className={th}>ICL</th>
                    <th className={th}>T-ICL</th>
                    <th className={th}>KPL</th>
                    <th className={th}>T-KPL</th>
                    <th className={th}>VIVA</th>
                    <th className={thL}>합계</th>
                    <th className={th}>EX</th>
                    <th className={th}>Red</th>
                    <th className={thL}>합계</th>
                    <th className={th}>레이저</th>
                    <th className={th}>렌즈</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => <DataRow key={r.month} label={r.month} d={r.d} />)}
                  <DataRow label="합계" d={total} head />
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            ※ 운영 DB 라이브(surgery API). <strong>엑스트라·웨이브비전·모노비전</strong>은 시력교정 부가시술(환자 수),
            <strong>재수술 합계</strong>는 RE_OPERATION 레코드(건) 단위입니다(레거시 월간보고 ±1 일치).
            <strong>라섹계 EX/Red · 재수술 레이저/렌즈 · 퍼스널/콘트라</strong>는 아직 별도 필드가 없어 빈칸입니다.
            재수술 레이저/렌즈 세부 분류는 팀장 검증 예정(Phase 2).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
