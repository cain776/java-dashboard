import { useMemo, useState } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { FilterBar } from '@/components/filters/FilterBar'
import { useFilterBar } from '@/components/filters/useFilterBar'
import { CHART_COLORS, MONTHS, YEAR_STROKE_PATTERNS } from '@/constants/chart'
import { changeRate, formatAxisNumber, periodLabel, type Period } from '@/utils/stats'

type MetricKey =
  | 'total'
  | 'visionCorrection'
  | 'cataract'
  | 'dreamlens'
  | 'outpatient'

interface MonthlyData {
  visionCorrection: number
  cataract: number
  dreamlens: number
  outpatient: number
}

type WithTotal = MonthlyData & { total: number }

const METRICS = [
  { key: 'total' as const, label: '전체 검사건수' },
  { key: 'visionCorrection' as const, label: '시력교정 검사건수' },
  { key: 'cataract' as const, label: '백내장 검사건수' },
  { key: 'dreamlens' as const, label: '드림렌즈 검사건수' },
  { key: 'outpatient' as const, label: '외래 검사건수' },
]

const DETAIL_METRIC_KEYS: Exclude<MetricKey, 'total'>[] = [
  'visionCorrection',
  'cataract',
  'dreamlens',
  'outpatient',
]

const METRIC_COLORS: Record<MetricKey, string> = {
  total: '#334155',
  visionCorrection: 'var(--chart-1)',
  cataract: 'var(--chart-3)',
  dreamlens: 'var(--chart-4)',
  outpatient: 'var(--chart-5)',
}

const mockData: Record<number, MonthlyData[]> = {
  2024: [
    { visionCorrection: 104, cataract: 36, dreamlens: 22, outpatient: 161 },
    { visionCorrection: 109, cataract: 38, dreamlens: 23, outpatient: 165 },
    { visionCorrection: 114, cataract: 40, dreamlens: 24, outpatient: 171 },
    { visionCorrection: 121, cataract: 43, dreamlens: 26, outpatient: 179 },
    { visionCorrection: 118, cataract: 42, dreamlens: 25, outpatient: 176 },
    { visionCorrection: 127, cataract: 46, dreamlens: 28, outpatient: 186 },
    { visionCorrection: 136, cataract: 50, dreamlens: 31, outpatient: 196 },
    { visionCorrection: 133, cataract: 49, dreamlens: 30, outpatient: 191 },
    { visionCorrection: 129, cataract: 47, dreamlens: 29, outpatient: 188 },
    { visionCorrection: 138, cataract: 53, dreamlens: 31, outpatient: 198 },
    { visionCorrection: 142, cataract: 55, dreamlens: 32, outpatient: 203 },
    { visionCorrection: 149, cataract: 58, dreamlens: 34, outpatient: 210 },
  ],
  2025: [
    { visionCorrection: 112, cataract: 39, dreamlens: 24, outpatient: 169 },
    { visionCorrection: 117, cataract: 41, dreamlens: 25, outpatient: 173 },
    { visionCorrection: 123, cataract: 44, dreamlens: 26, outpatient: 181 },
    { visionCorrection: 131, cataract: 47, dreamlens: 28, outpatient: 189 },
    { visionCorrection: 128, cataract: 46, dreamlens: 27, outpatient: 185 },
    { visionCorrection: 137, cataract: 50, dreamlens: 30, outpatient: 196 },
    { visionCorrection: 147, cataract: 55, dreamlens: 33, outpatient: 207 },
    { visionCorrection: 143, cataract: 53, dreamlens: 31, outpatient: 202 },
    { visionCorrection: 149, cataract: 57, dreamlens: 34, outpatient: 209 },
    { visionCorrection: 155, cataract: 59, dreamlens: 35, outpatient: 214 },
    { visionCorrection: 151, cataract: 58, dreamlens: 34, outpatient: 210 },
    { visionCorrection: 160, cataract: 63, dreamlens: 37, outpatient: 220 },
  ],
  2026: [
    { visionCorrection: 126, cataract: 44, dreamlens: 27, outpatient: 181 },
    { visionCorrection: 132, cataract: 46, dreamlens: 28, outpatient: 188 },
    { visionCorrection: 137, cataract: 48, dreamlens: 29, outpatient: 194 },
    { visionCorrection: 144, cataract: 52, dreamlens: 31, outpatient: 202 },
    { visionCorrection: 140, cataract: 50, dreamlens: 30, outpatient: 198 },
    { visionCorrection: 152, cataract: 56, dreamlens: 33, outpatient: 212 },
    { visionCorrection: 160, cataract: 60, dreamlens: 36, outpatient: 224 },
    { visionCorrection: 156, cataract: 58, dreamlens: 34, outpatient: 218 },
    { visionCorrection: 165, cataract: 62, dreamlens: 37, outpatient: 230 },
    { visionCorrection: 172, cataract: 66, dreamlens: 39, outpatient: 240 },
    { visionCorrection: 168, cataract: 64, dreamlens: 38, outpatient: 235 },
    { visionCorrection: 178, cataract: 70, dreamlens: 41, outpatient: 248 },
  ],
}

const withTotal = (data: MonthlyData): WithTotal => ({
  ...data,
  total: data.visionCorrection + data.cataract + data.dreamlens + data.outpatient,
})

const periodData = (period: Period) =>
  withTotal(
    mockData[period.year]?.[period.month] ?? {
      visionCorrection: 0,
      cataract: 0,
      dreamlens: 0,
      outpatient: 0,
    }
  )

const yearSum = (year: number) => {
  const data = mockData[year] ?? []
  const sum = {
    visionCorrection: data.reduce((acc, item) => acc + item.visionCorrection, 0),
    cataract: data.reduce((acc, item) => acc + item.cataract, 0),
    dreamlens: data.reduce((acc, item) => acc + item.dreamlens, 0),
    outpatient: data.reduce((acc, item) => acc + item.outpatient, 0),
  }

  return {
    ...sum,
    total: sum.visionCorrection + sum.cataract + sum.dreamlens + sum.outpatient,
  }
}

export function ExaminationPage() {
  const filter = useFilterBar()
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['total'])

  const { mode, periods, years } = filter
  const periodsData = useMemo(() => periods.map(periodData), [periods])
  const yearTotals = useMemo(() => years.map(yearSum), [years])
  const activeMetrics = useMemo(
    () => (selectedMetrics.includes('total') ? (['total'] as MetricKey[]) : selectedMetrics),
    [selectedMetrics]
  )

  const monthChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    periods.forEach((period, index) => {
      config[`p${index}`] = {
        label: periodLabel(period),
        color: CHART_COLORS[index],
      }
    })
    return config
  }, [periods])

  const monthChartData = useMemo(
    () =>
      METRICS.map((metric) => {
        const row: Record<string, string | number> = { name: metric.label }
        periodsData.forEach((data, index) => {
          row[`p${index}`] = data[metric.key]
        })
        return row
      }),
    [periodsData]
  )

  const yearChartSeries = useMemo(() => {
    if (activeMetrics.includes('total')) {
      return years.map((year, yearIndex) => ({
        key: `y${yearIndex}_total`,
        label: `${year}년 · 전체 검사건수`,
        color: METRIC_COLORS.total,
        strokeDasharray: YEAR_STROKE_PATTERNS[yearIndex],
      }))
    }

    return years.flatMap((year, yearIndex) =>
      activeMetrics.map((metricKey) => {
        const metric = METRICS.find((item) => item.key === metricKey)

        return {
          key: `y${yearIndex}_${metricKey}`,
          label: `${year}년 · ${metric?.label ?? metricKey}`,
          color: METRIC_COLORS[metricKey],
          strokeDasharray: YEAR_STROKE_PATTERNS[yearIndex],
        }
      })
    )
  }, [activeMetrics, years])

  const yearLineConfig = useMemo(() => {
    const config: ChartConfig = {}

    yearChartSeries.forEach((series) => {
      config[series.key] = {
        label: series.label,
        color: series.color,
      }
    })

    return config
  }, [yearChartSeries])

  const yearChartData = useMemo(
    () =>
      MONTHS.map((month, monthIndex) => {
        const row: Record<string, string | number> = { month }
        years.forEach((year, index) => {
          const data = withTotal(
            mockData[year]?.[monthIndex] ?? {
              visionCorrection: 0,
              cataract: 0,
              dreamlens: 0,
              outpatient: 0,
            }
          )

          if (activeMetrics.includes('total')) {
            row[`y${index}_total`] = data.total
            return
          }

          activeMetrics.forEach((metricKey) => {
            row[`y${index}_${metricKey}`] = data[metricKey]
          })
        })
        return row
      }),
    [activeMetrics, years]
  )

  const toggleMetric = (metricKey: MetricKey) => {
    if (metricKey === 'total') {
      setSelectedMetrics(['total'])
      return
    }

    setSelectedMetrics((current) => {
      const currentWithoutTotal = current.filter((item) => item !== 'total')
      const next = currentWithoutTotal.includes(metricKey)
        ? currentWithoutTotal.filter((item) => item !== metricKey)
        : [...currentWithoutTotal, metricKey]

      if (!next.length) {
        return ['total']
      }

      return DETAIL_METRIC_KEYS.filter((key) => next.includes(key))
    })
  }

  return (
    <div className="space-y-6">
      <FilterBar {...filter} />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {METRICS.map((metric) => {
          const values = mode === 'month' ? periodsData.map((data) => data[metric.key]) : yearTotals.map((data) => data[metric.key])
          const labels = mode === 'month' ? periods.map(periodLabel) : years.map((year) => `${year}년`)
          const base = values[0]

          return (
            <Card key={metric.key} className="gap-2 border-border/70 shadow-sm">
              <CardHeader className="gap-0.5 pb-0">
                <CardTitle className="text-base font-semibold tracking-normal text-gray-900">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 border-b border-border/60 pb-2.5">
                  <p className="text-sm text-muted-foreground">{labels[0]} (기준)</p>
                  <p className="min-w-[7ch] text-right text-3xl font-semibold tracking-tight tabular-nums text-gray-900">
                    {base.toLocaleString()}
                  </p>
                </div>
                {values.slice(1).map((value, index) => {
                  const rate = changeRate(base, value)
                  const isPositive = rate > 0
                  const isNeutral = rate === 0
                  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown

                  return (
                    <div key={labels[index + 1]} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                      <span className="text-sm text-muted-foreground">{labels[index + 1]}</span>
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            isNeutral
                              ? 'bg-gray-100 text-gray-600'
                              : isPositive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          <TrendIcon className="h-3 w-3" />
                          {rate > 0 ? '+' : ''}
                          {rate.toFixed(1)}%
                        </span>
                        <span className="min-w-[7ch] text-right text-sm font-medium tabular-nums text-gray-700">
                          {value.toLocaleString()}
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

      {mode === 'month' ? (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>검사 유형별 비교</CardTitle>
            <CardDescription>
              시력교정, 백내장, 드림렌즈, 외래 등 실제 실시 검사 건수를 비교합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthChartConfig} className="h-80 w-full">
              <BarChart data={monthChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {periods.map((_, index) => (
                  <Bar
                    key={`p${index}`}
                    dataKey={`p${index}`}
                    fill={`var(--color-p${index})`}
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
                <CardTitle>월별 검사 추이 비교</CardTitle>
                <CardDescription>
                  전체는 합산 흐름으로, 세부 검사를 여러 개 선택하면 그래프가 분화되어 표시됩니다.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-1">
                {METRICS.map((metric) => (
                  <button
                    key={metric.key}
                    type="button"
                    onClick={() => toggleMetric(metric.key)}
                    className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                      activeMetrics.includes(metric.key)
                        ? 'bg-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    style={activeMetrics.includes(metric.key) ? { color: METRIC_COLORS[metric.key] } : undefined}
                  >
                    {metric.label}
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
                {yearChartSeries.map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stroke={`var(--color-${series.key})`}
                    strokeWidth={activeMetrics.includes('total') ? 2.75 : 2.25}
                    strokeDasharray={series.strokeDasharray || undefined}
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
