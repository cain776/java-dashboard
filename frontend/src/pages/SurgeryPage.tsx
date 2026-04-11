import { useMemo, useState } from 'react'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import {
  Bar, BarChart, Line, LineChart,
  CartesianGrid, XAxis, YAxis,
} from 'recharts'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { FilterBar } from '@/components/filters/FilterBar'
import { useFilterBar } from '@/components/filters/useFilterBar'
import { CHART_COLORS, MONTHS, YEAR_STROKE_PATTERNS } from '@/constants/chart'
import { changeRate, formatAxisNumber, periodLabel, type Period } from '@/utils/stats'

/* ── 타입 ── */
type GroupKey = 'total' | 'refractive' | 'lens' | 'cataract'

interface SurgeryData {
  lasek: number; lasik: number; smile: number; smilePro: number
  icl: number; tIcl: number; kpl: number; tKpl: number; viva: number
  catMulti: number; catMono: number; catEdof: number
}

/* ── 상수 ── */
const SURGERY_KEYS: (keyof SurgeryData)[] = [
  'lasek','lasik','smile','smilePro','icl','tIcl','kpl','tKpl','viva','catMulti','catMono','catEdof',
]

const GROUPS: { key: GroupKey; label: string; types: (keyof SurgeryData)[] }[] = [
  { key: 'total', label: '전체 수술건수', types: SURGERY_KEYS },
  { key: 'refractive', label: '시력교정', types: ['lasek','lasik','smile','smilePro'] },
  { key: 'lens', label: '렌즈/각막', types: ['icl','tIcl','kpl','tKpl','viva'] },
  { key: 'cataract', label: '백내장', types: ['catMulti','catMono','catEdof'] },
]

const DETAIL_GROUP_KEYS: Exclude<GroupKey, 'total'>[] = ['refractive', 'lens', 'cataract']

const GROUP_COLORS: Record<GroupKey, string> = {
  total: '#334155',
  refractive: 'var(--chart-1)',
  lens: 'var(--chart-3)',
  cataract: 'var(--chart-4)',
}

/* ── Mock 데이터 ── */
// [lasek, lasik, smile, smilePro, icl, tIcl, kpl, tKpl, viva, catMulti, catMono, catEdof]
const toData = (a: number[]): SurgeryData => ({
  lasek:a[0], lasik:a[1], smile:a[2], smilePro:a[3],
  icl:a[4], tIcl:a[5], kpl:a[6], tKpl:a[7], viva:a[8],
  catMulti:a[9], catMono:a[10], catEdof:a[11],
})

const mockData: Record<number, SurgeryData[]> = {
  2024: [
    [14,11,22,15,7,4,2,1,3,8,7,4],[15,12,24,17,8,5,2,1,3,9,7,5],
    [17,13,26,18,9,5,3,2,3,10,8,5],[19,14,28,20,10,6,3,2,4,11,9,6],
    [18,13,27,19,9,5,3,2,4,10,8,5],[21,16,31,22,11,7,4,2,5,12,10,7],
    [23,17,33,24,12,7,4,2,5,14,11,7],[22,16,31,23,11,7,3,2,5,13,10,7],
    [24,18,35,26,13,8,4,3,5,15,12,8],[26,19,37,28,14,8,4,3,6,16,12,8],
    [25,18,35,26,13,8,4,2,5,15,11,8],[27,20,38,28,15,9,5,3,6,16,13,9],
  ].map(toData),
  2025: [
    [18,14,28,20,10,6,3,2,4,12,9,6],[20,16,30,22,11,7,3,2,5,13,10,7],
    [22,15,32,24,12,8,4,2,4,14,11,7],[25,18,35,26,13,8,4,3,5,15,12,8],
    [23,17,33,25,12,7,3,2,5,14,11,8],[28,20,38,28,15,9,5,3,6,16,13,9],
    [30,22,40,30,16,10,5,3,6,18,14,10],[28,21,38,28,15,9,4,3,6,17,13,9],
    [32,23,42,32,17,10,5,3,7,19,15,10],[34,25,44,34,18,11,5,4,7,20,16,11],
    [32,24,42,32,17,10,5,3,7,19,15,10],[35,26,46,35,19,12,6,4,8,21,17,12],
  ].map(toData),
  2026: [
    [24,18,35,26,13,8,4,3,5,15,12,8],[27,20,38,29,15,9,5,3,6,17,13,9],
    [25,19,36,27,14,9,4,3,6,16,12,9],[30,22,42,32,17,10,5,3,7,19,15,11],
    [28,21,40,30,16,9,5,3,6,18,14,10],[33,24,45,34,18,11,6,4,7,20,16,12],
    [36,26,48,36,20,12,6,4,8,22,17,13],[34,25,46,35,19,11,5,4,7,21,16,12],
    [38,27,50,38,21,12,6,4,8,23,18,13],[40,29,52,40,22,13,7,5,9,24,19,14],
    [38,28,50,38,21,12,6,4,8,23,18,13],[42,30,54,42,24,14,7,5,9,25,20,15],
  ].map(toData),
}

/* ── 유틸 ── */
const EMPTY: SurgeryData = { lasek:0,lasik:0,smile:0,smilePro:0,icl:0,tIcl:0,kpl:0,tKpl:0,viva:0,catMulti:0,catMono:0,catEdof:0 }
const gSum = (d: SurgeryData, g: typeof GROUPS[number]) => g.types.reduce((s, k) => s + d[k], 0)
const pData = (p: Period) => mockData[p.year]?.[p.month] ?? EMPTY

const yearSum = (year: number): SurgeryData => {
  const ms = mockData[year] ?? []
  const r = { ...EMPTY }
  for (const m of ms) for (const k of SURGERY_KEYS) r[k] += m[k]
  return r
}

/* ── 메인 ── */
export function SurgeryPage() {
  const filter = useFilterBar()
  const { mode, periods, years } = filter

  const [selectedGroups, setSelectedGroups] = useState<GroupKey[]>(['total'])

  /* 월별 */
  const periodsData = useMemo(() => periods.map(pData), [periods])
  const activeGroups = useMemo(
    () => (selectedGroups.includes('total') ? (['total'] as GroupKey[]) : selectedGroups),
    [selectedGroups],
  )

  const monthChartConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    periods.forEach((p, i) => { cfg[`p${i}`] = { label: periodLabel(p), color: CHART_COLORS[i] } })
    return cfg
  }, [periods])

  const monthChartData = useMemo(() =>
    GROUPS.map((g) => {
      const row: Record<string, string | number> = { name: g.label }
      periodsData.forEach((d, i) => { row[`p${i}`] = gSum(d, g) })
      return row
    }),
    [periodsData],
  )

  /* 연도별 */
  const yearTotals = useMemo(() => years.map(yearSum), [years])

  const yearChartSeries = useMemo(() => {
    if (activeGroups.includes('total')) {
      return years.map((year, yi) => ({
        key: `y${yi}_total`, label: `${year}년 · 전체`,
        color: GROUP_COLORS.total, strokeDasharray: YEAR_STROKE_PATTERNS[yi],
      }))
    }
    return years.flatMap((year, yi) =>
      activeGroups.map((gk) => {
        const g = GROUPS.find((item) => item.key === gk)
        return {
          key: `y${yi}_${gk}`, label: `${year}년 · ${g?.label ?? gk}`,
          color: GROUP_COLORS[gk], strokeDasharray: YEAR_STROKE_PATTERNS[yi],
        }
      }),
    )
  }, [activeGroups, years])

  const yearLineConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    yearChartSeries.forEach((s) => { cfg[s.key] = { label: s.label, color: s.color } })
    return cfg
  }, [yearChartSeries])

  const yearChartData = useMemo(() =>
    MONTHS.map((month, mi) => {
      const row: Record<string, string | number> = { month }
      years.forEach((y, i) => {
        const d = mockData[y]?.[mi] ?? EMPTY
        if (activeGroups.includes('total')) {
          row[`y${i}_total`] = gSum(d, GROUPS[0])
          return
        }
        activeGroups.forEach((gk) => {
          const g = GROUPS.find((item) => item.key === gk)!
          row[`y${i}_${gk}`] = gSum(d, g)
        })
      })
      return row
    }),
    [activeGroups, years],
  )

  const toggleGroup = (gk: GroupKey) => {
    if (gk === 'total') { setSelectedGroups(['total']); return }
    setSelectedGroups((cur) => {
      const without = cur.filter((k) => k !== 'total')
      const next = without.includes(gk) ? without.filter((k) => k !== gk) : [...without, gk]
      if (!next.length) return ['total']
      return DETAIL_GROUP_KEYS.filter((k) => next.includes(k))
    })
  }

  return (
    <div className="space-y-6">
      {/* ── 필터 바 ── */}
      <FilterBar {...filter} />

      {/* ── KPI 카드 ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {GROUPS.map((g) => {
          const values = mode === 'month'
            ? periodsData.map((d) => gSum(d, g))
            : yearTotals.map((d) => gSum(d, g))
          const labels = mode === 'month' ? periods.map(periodLabel) : years.map((y) => `${y}년`)
          const base = values[0]

          return (
            <Card key={g.key} className="gap-2 border-border/70 shadow-sm">
              <CardHeader className="gap-0.5 pb-0">
                <CardTitle className="text-base font-semibold tracking-normal text-gray-900">{g.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 border-b border-border/60 pb-2.5">
                  <p className="text-sm text-muted-foreground">{labels[0]} (기준)</p>
                  <p className="min-w-[7ch] text-right text-3xl font-semibold tracking-tight tabular-nums text-gray-900">
                    {base.toLocaleString()}
                  </p>
                </div>
                {values.slice(1).map((val, i) => {
                  const rate = changeRate(base, val)
                  const positive = rate > 0
                  const neutral = rate === 0
                  const TrendIcon = neutral ? Minus : positive ? TrendingUp : TrendingDown
                  return (
                    <div key={labels[i + 1]} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                      <span className="text-sm text-muted-foreground">{labels[i + 1]}</span>
                      <div className="flex items-center justify-end gap-2">
                        <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          neutral ? 'bg-gray-100 text-gray-600' : positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          <TrendIcon className="h-3 w-3" />
                          {rate > 0 ? '+' : ''}{rate.toFixed(1)}%
                        </span>
                        <span className="min-w-[7ch] text-right text-sm font-medium tabular-nums text-gray-700">
                          {val.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* ── 차트 ── */}
      {mode === 'month' ? (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>수술 유형별 비교</CardTitle>
            <CardDescription>{periods.map(periodLabel).join(' · ')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthChartConfig} className="h-80 w-full">
              <BarChart data={monthChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {periods.map((_, i) => (
                  <Bar key={`p${i}`} dataKey={`p${i}`} fill={`var(--color-p${i})`}
                    radius={[4, 4, 0, 0]} barSize={Math.max(16, 56 / periods.length)} />
                ))}
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>월별 추이 비교</CardTitle>
                <CardDescription>
                  전체는 합산 흐름으로, 세부 그룹을 여러 개 선택하면 그래프가 분화되어 표시됩니다.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-1">
                {GROUPS.map((g) => (
                  <button key={g.key} type="button" onClick={() => toggleGroup(g.key)}
                    className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                      activeGroups.includes(g.key) ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    style={activeGroups.includes(g.key) ? { color: GROUP_COLORS[g.key] } : undefined}
                  >{g.label}</button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={yearLineConfig} className="h-80 w-full">
              <LineChart data={yearChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
                <ChartLegend content={<ChartLegendContent />} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {yearChartSeries.map((s) => (
                  <Line key={s.key} type="monotone" dataKey={s.key}
                    stroke={`var(--color-${s.key})`}
                    strokeWidth={activeGroups.includes('total') ? 2.75 : 2.25}
                    strokeDasharray={s.strokeDasharray || undefined}
                    dot={yearChartSeries.length <= 4 ? { r: 4 } : false}
                    activeDot={{ r: 6 }} />
                ))}
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
