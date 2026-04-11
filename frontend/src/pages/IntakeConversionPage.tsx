import { useState, useMemo } from 'react'
import { TrendingDown, TrendingUp, Minus, Plus, X } from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, Line, LineChart, ComposedChart,
  Pie, PieChart,
  CartesianGrid, XAxis, YAxis,
} from 'recharts'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  type CompareMode,
  formatAxisNumber,
  formatAxisPercent,
  getCurrentPeriod,
  getDefaultPeriods,
  getDefaultYears,
  periodLabel,
  type Period,
} from '@/utils/stats'

/* ── 상수 ── */
type ChannelKey = 'total' | 'incall' | 'outcall' | 'kakao' | 'naver' | 'homepage'

interface MonthlyIntake { incall: number; outcall: number; kakao: number; naver: number; homepage: number }
type WithTotal = MonthlyIntake & { total: number }

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']
const MAX_PERIODS = 4
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const CURRENT_PERIOD = getCurrentPeriod()
const DEFAULT_PERIODS = getDefaultPeriods(CURRENT_PERIOD)
const DEFAULT_YEARS = getDefaultYears(CURRENT_PERIOD.year)

const METRICS: { key: ChannelKey; label: string }[] = [
  { key: 'total', label: '전체 유입' },
  { key: 'incall', label: '인콜 검사예약' },
  { key: 'outcall', label: '아웃콜' },
  { key: 'kakao', label: '카카오톡' },
  { key: 'naver', label: '네이버' },
  { key: 'homepage', label: '홈페이지' },
]

const DETAIL_KEYS: Exclude<ChannelKey, 'total'>[] = ['incall', 'outcall', 'kakao', 'naver', 'homepage']

const STACK_CONFIG = {
  incall: { label: '인콜', color: 'var(--chart-1)' },
  outcall: { label: '아웃콜', color: 'var(--chart-2)' },
  kakao: { label: '카카오톡', color: 'var(--chart-3)' },
  naver: { label: '네이버', color: 'var(--chart-5)' },
  homepage: { label: '홈페이지', color: 'var(--chart-4)' },
} satisfies ChartConfig

const COMPOSED_CONFIG = {
  total: { label: '유입 건수', color: 'var(--chart-1)' },
  rate: { label: '증감률 (%)', color: 'var(--chart-3)' },
} satisfies ChartConfig

const METRIC_COLORS: Record<ChannelKey, string> = {
  total: '#334155', incall: 'var(--chart-1)', outcall: 'var(--chart-2)',
  kakao: 'var(--chart-3)', naver: 'var(--chart-5)', homepage: 'var(--chart-4)',
}

const YEAR_STROKE_PATTERNS = ['', '10 4', '4 4', '2 4']

/* ── Mock 데이터 ── */
const mockData: Record<number, MonthlyIntake[]> = {
  2025: [
    { incall: 42, outcall: 28, kakao: 35, naver: 50, homepage: 18 },
    { incall: 48, outcall: 32, kakao: 38, naver: 55, homepage: 20 },
    { incall: 45, outcall: 30, kakao: 40, naver: 52, homepage: 22 },
    { incall: 55, outcall: 35, kakao: 45, naver: 60, homepage: 25 },
    { incall: 50, outcall: 33, kakao: 42, naver: 58, homepage: 23 },
    { incall: 60, outcall: 38, kakao: 48, naver: 65, homepage: 28 },
    { incall: 65, outcall: 42, kakao: 52, naver: 70, homepage: 30 },
    { incall: 62, outcall: 40, kakao: 50, naver: 68, homepage: 28 },
    { incall: 68, outcall: 44, kakao: 55, naver: 72, homepage: 32 },
    { incall: 72, outcall: 48, kakao: 58, naver: 78, homepage: 35 },
    { incall: 70, outcall: 45, kakao: 56, naver: 75, homepage: 33 },
    { incall: 75, outcall: 50, kakao: 60, naver: 80, homepage: 38 },
  ],
  2026: [
    { incall: 55, outcall: 35, kakao: 45, naver: 62, homepage: 25 },
    { incall: 60, outcall: 40, kakao: 50, naver: 68, homepage: 28 },
    { incall: 58, outcall: 38, kakao: 48, naver: 65, homepage: 26 },
    { incall: 68, outcall: 45, kakao: 55, naver: 75, homepage: 32 },
    { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 },
    { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 },
    { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 },
    { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 },
    { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 },
    { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 },
    { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 },
    { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 },
  ],
}

/* ── 유틸 ── */
const withTotal = (d: MonthlyIntake): WithTotal => ({ ...d, total: d.incall + d.outcall + d.kakao + d.naver + d.homepage })
function changeRate(a: number, b: number) { if (a === 0) return b === 0 ? 0 : 100; return ((b - a) / a) * 100 }
const periodData = (p: Period) => withTotal(mockData[p.year]?.[p.month] ?? { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 })
const yearSum = (year: number) => { const data = mockData[year] ?? []; const s = { incall: data.reduce((a, d) => a + d.incall, 0), outcall: data.reduce((a, d) => a + d.outcall, 0), kakao: data.reduce((a, d) => a + d.kakao, 0), naver: data.reduce((a, d) => a + d.naver, 0), homepage: data.reduce((a, d) => a + d.homepage, 0) }; return { ...s, total: s.incall + s.outcall + s.kakao + s.naver + s.homepage } }

/* ── Select ── */
function Select({ value, onChange, options, title }: { value: number; onChange: (v: number) => void; options: { value: number; label: string }[]; title: string }) {
  return (
    <div className="relative">
      <select value={value} title={title} onChange={(e) => onChange(Number(e.target.value))} className="h-8 appearance-none rounded-md border border-gray-200 bg-gray-50 pl-3 pr-7 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none">
        {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
      <svg className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
    </div>
  )
}

/* ── 기간 칩 ── */
const CHIP_STYLES: Record<number, string> = { 0: 'border-blue-400 text-blue-600', 1: 'border-pink-400 text-pink-600', 2: 'border-amber-400 text-amber-600', 3: 'border-emerald-400 text-emerald-600' }
function PeriodChip({ label, index, isBase, onRemove }: { label: string; index: number; isBase: boolean; onRemove?: () => void }) {
  return (
    <span className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium ${CHIP_STYLES[index] ?? CHIP_STYLES[0]}`}>
      {isBase && <span className="rounded bg-current/10 px-1.5 py-0.5 text-xs opacity-70">기준</span>}
      {label}
      {onRemove && (<button type="button" title={`${label} 삭제`} onClick={onRemove} className="hover:opacity-60 transition-opacity"><X className="h-3.5 w-3.5" /></button>)}
    </span>
  )
}

/* ── 메인 ── */
export function IntakeConversionPage() {
  const [mode, setMode] = useState<CompareMode>('month')
  const [periods, setPeriods] = useState<Period[]>(() => DEFAULT_PERIODS)
  const [years, setYears] = useState<number[]>(() => DEFAULT_YEARS)
  const [addYear, setAddYear] = useState(CURRENT_PERIOD.year)
  const [addMonth, setAddMonth] = useState(CURRENT_PERIOD.month)
  const [addYearOnly, setAddYearOnly] = useState(DEFAULT_YEARS[1] ?? CURRENT_PERIOD.year)
  const [selectedMetrics, setSelectedMetrics] = useState<ChannelKey[]>(['total'])

  const yearOptions = YEARS.map((y) => ({ value: y, label: `${y}년` }))
  const monthOptions = MONTHS.map((m, i) => ({ value: i, label: m }))
  const addPeriod = () => {
    if (mode === 'month' && periods.length < MAX_PERIODS) { const dup = periods.some((p) => p.year === addYear && p.month === addMonth); if (!dup) setPeriods([...periods, { year: addYear, month: addMonth }]) }
    if (mode === 'year' && years.length < MAX_PERIODS) { if (!years.includes(addYearOnly)) setYears([...years, addYearOnly]) }
  }
  const removePeriod = (i: number) => {
    if (mode === 'month' && periods.length > 1) setPeriods(periods.filter((_, idx) => idx !== i))
    if (mode === 'year' && years.length > 1) setYears(years.filter((_, idx) => idx !== i))
  }

  /* ── 월별 데이터 ── */
  const periodsData = useMemo(() => periods.map(periodData), [periods])
  const activeMetrics = useMemo(() => (selectedMetrics.includes('total') ? (['total'] as ChannelKey[]) : selectedMetrics), [selectedMetrics])
  const monthChartConfig = useMemo(() => { const cfg: ChartConfig = {}; periods.forEach((p, i) => { cfg[`p${i}`] = { label: periodLabel(p), color: CHART_COLORS[i] } }); return cfg }, [periods])
  const monthChartData = useMemo(() => METRICS.map((m) => { const row: Record<string, string | number> = { name: m.label }; periodsData.forEach((d, i) => { row[`p${i}`] = d[m.key] }); return row }), [periodsData])
  const stackedData = useMemo(() => periods.map((p, i) => ({ name: periodLabel(p), ...Object.fromEntries(DETAIL_KEYS.map((k) => [k, periodsData[i][k]])) })), [periods, periodsData])
  const donutData = useMemo(() => periods.map((p, i) => ({ label: periodLabel(p), slices: DETAIL_KEYS.map((key) => ({ name: STACK_CONFIG[key].label, value: periodsData[i][key], fill: STACK_CONFIG[key].color })) })), [periods, periodsData])
  const composedData = useMemo(() => periods.map((p, i) => ({ name: periodLabel(p), total: periodsData[i].total, rate: i === 0 ? 0 : Math.round(changeRate(periodsData[0].total, periodsData[i].total) * 10) / 10 })), [periods, periodsData])

  /* ── 연도별 데이터 ── */
  const yearTotals = useMemo(() => years.map(yearSum), [years])
  const yearChartSeries = useMemo(() => {
    if (activeMetrics.includes('total')) { return years.map((year, yi) => ({ key: `y${yi}_total`, label: `${year}년 · 전체`, color: METRIC_COLORS.total, strokeDasharray: YEAR_STROKE_PATTERNS[yi] })) }
    return years.flatMap((year, yi) => activeMetrics.map((mk) => ({ key: `y${yi}_${mk}`, label: `${year}년 · ${METRICS.find((item) => item.key === mk)?.label ?? mk}`, color: METRIC_COLORS[mk], strokeDasharray: YEAR_STROKE_PATTERNS[yi] })))
  }, [activeMetrics, years])
  const yearLineConfig = useMemo(() => { const cfg: ChartConfig = {}; yearChartSeries.forEach((s) => { cfg[s.key] = { label: s.label, color: s.color } }); return cfg }, [yearChartSeries])
  const yearChartData = useMemo(() => MONTHS.map((month, mi) => { const row: Record<string, string | number> = { month }; years.forEach((y, i) => { const d = withTotal(mockData[y]?.[mi] ?? { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 }); if (activeMetrics.includes('total')) { row[`y${i}_total`] = d.total; return }; activeMetrics.forEach((mk) => { row[`y${i}_${mk}`] = d[mk] }) }); return row }), [activeMetrics, years])
  const yearStackedData = useMemo(() => MONTHS.map((month, mi) => { const d = mockData[years[0]]?.[mi] ?? { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 }; return { month, ...d } }), [years])
  const yearComposedData = useMemo(() => MONTHS.map((month, mi) => { const base = withTotal(mockData[years[0]]?.[mi] ?? { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 }); const comp = years[1] ? withTotal(mockData[years[1]]?.[mi] ?? { incall: 0, outcall: 0, kakao: 0, naver: 0, homepage: 0 }) : base; return { month, total: base.total, rate: base.total === 0 ? 0 : Math.round(changeRate(comp.total, base.total) * 10) / 10 } }), [years])

  const toggleMetric = (metricKey: ChannelKey) => {
    if (metricKey === 'total') { setSelectedMetrics(['total']); return }
    setSelectedMetrics((current) => {
      const without = current.filter((item) => item !== 'total')
      const next = without.includes(metricKey) ? without.filter((item) => item !== metricKey) : [...without, metricKey]
      if (!next.length) return ['total']
      return DETAIL_KEYS.filter((key) => next.includes(key))
    })
  }

  return (
    <div className="space-y-6">
      {/* ── 필터 바 ── */}
      <Card className="border-border/70 shadow-sm !py-0">
        <CardContent className="flex min-h-14 flex-wrap items-center gap-2 py-1.5">
          <div className="flex h-8 items-center gap-1 rounded-md bg-gray-100 p-0.5">
            {([['month', '월별'], ['year', '연도별']] as const).map(([m, label]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`h-full rounded px-3 text-sm font-medium transition-colors ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
            ))}
          </div>
          <div className="h-5 w-px bg-gray-200" />
          {mode === 'month'
            ? periods.map((p, i) => (<PeriodChip key={`${p.year}-${p.month}`} label={periodLabel(p)} index={i} isBase={i === 0} onRemove={periods.length > 1 ? () => removePeriod(i) : undefined} />))
            : years.map((y, i) => (<PeriodChip key={y} label={`${y}년`} index={i} isBase={i === 0} onRemove={years.length > 1 ? () => removePeriod(i) : undefined} />))
          }
          <div className="h-5 w-px bg-gray-200" />
          {((mode === 'month' && periods.length < MAX_PERIODS) || (mode === 'year' && years.length < MAX_PERIODS)) && (
            <div className="flex items-center gap-1.5">
              {mode === 'month' ? (<><Select value={addYear} onChange={setAddYear} options={yearOptions} title="추가 연도" /><Select value={addMonth} onChange={setAddMonth} options={monthOptions} title="추가 월" /></>) : (<Select value={addYearOnly} onChange={setAddYearOnly} options={yearOptions} title="추가 연도" />)}
              <button type="button" onClick={addPeriod} className="flex h-8 items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"><Plus className="h-3.5 w-3.5" />추가</button>
            </div>
          )}
          <button type="button" className="ml-auto h-8 rounded-md bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800">조회</button>
        </CardContent>
      </Card>

      {/* ── KPI 카드 (3열 × 2행) ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {METRICS.map((m) => {
          const values = mode === 'month' ? periodsData.map((d) => d[m.key]) : yearTotals.map((d) => d[m.key])
          const labels = mode === 'month' ? periods.map(periodLabel) : years.map((y) => `${y}년`)
          const base = values[0]
          return (
            <Card key={m.key} className="gap-2 border-border/70 shadow-sm">
              <CardHeader className="gap-0.5 pb-0"><CardTitle className="text-base font-semibold tracking-normal text-gray-900">{m.label}</CardTitle></CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 border-b border-border/60 pb-2.5">
                  <p className="text-sm text-muted-foreground">{labels[0]} (기준)</p>
                  <p className="min-w-[7ch] text-right text-3xl font-semibold tracking-tight tabular-nums text-gray-900">{base.toLocaleString()}</p>
                </div>
                {values.slice(1).map((val, i) => {
                  const rate = changeRate(base, val); const positive = rate > 0; const neutral = rate === 0
                  const TrendIcon = neutral ? Minus : positive ? TrendingUp : TrendingDown
                  return (
                    <div key={labels[i + 1]} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                      <span className="text-sm text-muted-foreground">{labels[i + 1]}</span>
                      <div className="flex items-center justify-end gap-2">
                        <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${neutral ? 'bg-gray-100 text-gray-600' : positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          <TrendIcon className="h-3 w-3" />{rate > 0 ? '+' : ''}{rate.toFixed(1)}%
                        </span>
                        <span className="min-w-[7ch] text-right text-sm font-medium tabular-nums text-gray-700">{val.toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* ── 차트 2×2 ── */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {mode === 'month' ? (<>
          <Card className="border-border/70 shadow-sm">
            <CardHeader><CardTitle>채널별 비교</CardTitle><CardDescription>{periods.map(periodLabel).join(' · ')}</CardDescription></CardHeader>
            <CardContent>
              <ChartContainer config={monthChartConfig} className="h-72 w-full">
                <BarChart data={monthChartData}>
                  <CartesianGrid vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
                  <ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
                  {periods.map((_, i) => (<Bar key={`p${i}`} dataKey={`p${i}`} fill={`var(--color-p${i})`} radius={[4, 4, 0, 0]} barSize={Math.max(12, 48 / periods.length)} />))}
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader><CardTitle>구성비</CardTitle><CardDescription>채널별 유입 적층</CardDescription></CardHeader>
            <CardContent>
              <ChartContainer config={STACK_CONFIG} className="h-72 w-full">
                <BarChart data={stackedData}>
                  <CartesianGrid vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
                  <ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
                  {DETAIL_KEYS.map((key, i) => (<Bar key={key} dataKey={key} stackId="s" fill={`var(--color-${key})`} radius={i === DETAIL_KEYS.length - 1 ? [4, 4, 0, 0] : undefined} />))}
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader><CardTitle>비율</CardTitle><CardDescription>기간별 채널 비율</CardDescription></CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${periods.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
                {donutData.map((d) => (
                  <div key={d.label} className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{d.label}</span>
                    <ChartContainer config={STACK_CONFIG} className="mx-auto aspect-square h-40">
                      <PieChart><ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} /><Pie data={d.slices} dataKey="value" nameKey="name" innerRadius={32} strokeWidth={2} /></PieChart>
                    </ChartContainer>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader><CardTitle>건수 + 증감률</CardTitle><CardDescription>기준 대비 전체 유입과 변화율</CardDescription></CardHeader>
            <CardContent>
              <ChartContainer config={COMPOSED_CONFIG} className="h-72 w-full">
                <ComposedChart data={composedData}>
                  <CartesianGrid vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisPercent} />
                  <ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="left" dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} barSize={40} />
                  <Line yAxisId="right" type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>) : (<>
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>추이 비교</CardTitle>
                <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-0.5">
                  {METRICS.map((m) => (<button key={m.key} type="button" onClick={() => toggleMetric(m.key)} className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${activeMetrics.includes(m.key) ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} style={activeMetrics.includes(m.key) ? { color: METRIC_COLORS[m.key] } : undefined}>{m.label}</button>))}
                </div>
              </div>
              <CardDescription>{years.map((y) => `${y}년`).join(' · ')} — 12개월</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={yearLineConfig} className="h-72 w-full">
                <LineChart data={yearChartData}>
                  <CartesianGrid vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
                  <ChartLegend content={<ChartLegendContent />} /><ChartTooltip content={<ChartTooltipContent />} />
                  {yearChartSeries.map((s) => (<Line key={s.key} type="monotone" dataKey={s.key} stroke={`var(--color-${s.key})`} strokeWidth={activeMetrics.includes('total') ? 2.75 : 2.25} strokeDasharray={s.strokeDasharray || undefined} dot={yearChartSeries.length <= 4 ? { r: 4 } : false} activeDot={{ r: 6 }} />))}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader><CardTitle>구성비</CardTitle><CardDescription>{years[0]}년 채널별 월별 적층</CardDescription></CardHeader>
            <CardContent>
              <ChartContainer config={STACK_CONFIG} className="h-72 w-full">
                <AreaChart data={yearStackedData}>
                  <CartesianGrid vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} /><YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
                  <ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
                  <defs>{DETAIL_KEYS.map((key) => (<linearGradient key={key} id={`fill-i-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={STACK_CONFIG[key].color} stopOpacity={0.8} /><stop offset="95%" stopColor={STACK_CONFIG[key].color} stopOpacity={0.1} /></linearGradient>))}</defs>
                  {DETAIL_KEYS.map((key) => (<Area key={key} type="monotone" dataKey={key} stackId="1" fill={`url(#fill-i-${key})`} stroke={STACK_CONFIG[key].color} />))}
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader><CardTitle>건수 + 증감률</CardTitle><CardDescription>{years[0]}년 월별 · {years[1] ?? years[0]}년 대비</CardDescription></CardHeader>
            <CardContent>
              <ChartContainer config={COMPOSED_CONFIG} className="h-72 w-full">
                <ComposedChart data={yearComposedData}>
                  <CartesianGrid vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisPercent} />
                  <ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="left" dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} barSize={24} />
                  <Line yAxisId="right" type="monotone" dataKey="rate" stroke="var(--color-rate)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="border-border/70 shadow-sm">
            <CardHeader><CardTitle>연도별 비율</CardTitle><CardDescription>연간 합산 채널별 비율</CardDescription></CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${years.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
                {years.map((y, yi) => (
                  <div key={y} className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{y}년</span>
                    <ChartContainer config={STACK_CONFIG} className="mx-auto aspect-square h-40">
                      <PieChart><ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} /><Pie data={DETAIL_KEYS.map((key) => ({ name: STACK_CONFIG[key].label, value: yearTotals[yi][key], fill: STACK_CONFIG[key].color }))} dataKey="value" nameKey="name" innerRadius={32} strokeWidth={2} /></PieChart>
                    </ChartContainer>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>)}
      </section>
    </div>
  )
}
