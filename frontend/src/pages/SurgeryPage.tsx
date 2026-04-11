import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { changeRate, formatAxisNumber, periodLabel } from '@/utils/stats'
import { statsApi, type SurgeryMonthlyItem } from '@/api/stats'

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

/* ── 유틸 ── */
const EMPTY: SurgeryData = { lasek:0,lasik:0,smile:0,smilePro:0,icl:0,tIcl:0,kpl:0,tKpl:0,viva:0,catMulti:0,catMono:0,catEdof:0 }
const gSum = (d: SurgeryData, g: typeof GROUPS[number]) => g.types.reduce((s, k) => s + d[k], 0)

function toDataMap(items: SurgeryMonthlyItem[]): Record<number, SurgeryData[]> {
  const map: Record<number, SurgeryData[]> = {}
  for (const item of items) {
    if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    map[item.year][item.month - 1] = {
      lasek: item.lasek, lasik: item.lasik, smile: item.smile, smilePro: item.smilePro,
      icl: item.icl, tIcl: item.tIcl, kpl: item.kpl, tKpl: item.tKpl, viva: item.viva,
      catMulti: item.catMulti, catMono: item.catMono, catEdof: item.catEdof,
    }
  }
  return map
}

/* ── 메인 ── */
export function SurgeryPage() {
  const filter = useFilterBar()
  const { mode, periods, years } = filter

  const [selectedGroups, setSelectedGroups] = useState<GroupKey[]>(['total'])

  // 필요한 연도 수집
  const queryYears = useMemo(() => {
    const set = new Set<number>()
    if (mode === 'month') periods.forEach((p) => set.add(p.year))
    else years.forEach((y) => set.add(y))
    return [...set].sort()
  }, [mode, periods, years])

  // API 호출
  const { data: apiData } = useQuery({
    queryKey: ['surgery-monthly', queryYears],
    queryFn: () => statsApi.getSurgeryMonthly(queryYears),
  })

  const dataMap = useMemo(() => apiData ? toDataMap(apiData) : {}, [apiData])
  /* 월별 */
  const periodsData = useMemo(
    () => periods.map((period) => dataMap[period.year]?.[period.month] ?? EMPTY),
    [periods, dataMap],
  )
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
  const yearTotals = useMemo(
    () =>
      years.map((year) => {
        const monthlyItems = dataMap[year] ?? []
        const result = { ...EMPTY }

        for (const item of monthlyItems) {
          for (const key of SURGERY_KEYS) {
            result[key] += item[key]
          }
        }

        return result
      }),
    [years, dataMap],
  )

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
        const d = dataMap[y]?.[mi] ?? EMPTY
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
    [activeGroups, years, dataMap],
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
                    <Bar
                      key={`p${i}`}
                      dataKey={`p${i}`}
                      fill={`var(--color-p${i})`}
                      radius={[4, 4, 0, 0]}
                      barSize={Math.max(16, 56 / periods.length)}
                    />
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
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => toggleGroup(g.key)}
                      className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                        activeGroups.includes(g.key) ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                      style={activeGroups.includes(g.key) ? { color: GROUP_COLORS[g.key] } : undefined}
                    >
                      {g.label}
                    </button>
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
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stroke={`var(--color-${s.key})`}
                      strokeWidth={activeGroups.includes('total') ? 2.75 : 2.25}
                      strokeDasharray={s.strokeDasharray || undefined}
                      dot={yearChartSeries.length <= 4 ? { r: 4 } : false}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
    </div>
  )
}
