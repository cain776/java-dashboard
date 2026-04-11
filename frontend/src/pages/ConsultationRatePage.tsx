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
import { formatAxisPercent, periodLabel, type Period } from '@/utils/stats'

type MetricKey =
  | 'overallConsultation'
  | 'visionConsultation'
  | 'visionSurgery'
  | 'cataractSurgery'

interface MonthlyData {
  overallConsultation: number
  visionConsultation: number
  visionSurgery: number
  cataractSurgery: number
}

const METRICS = [
  { key: 'overallConsultation' as const, label: '전체 상담 전환율' },
  { key: 'visionConsultation' as const, label: '시력교정 상담 전환율' },
  { key: 'visionSurgery' as const, label: '시력교정 수술 전환율' },
  { key: 'cataractSurgery' as const, label: '백내장 수술 전환율' },
]

const DETAIL_METRIC_KEYS: Exclude<MetricKey, 'overallConsultation'>[] = [
  'visionConsultation',
  'visionSurgery',
  'cataractSurgery',
]

const METRIC_COLORS: Record<MetricKey, string> = {
  overallConsultation: '#334155',
  visionConsultation: 'var(--chart-1)',
  visionSurgery: 'var(--chart-3)',
  cataractSurgery: 'var(--chart-4)',
}

const mockData: Record<number, MonthlyData[]> = {
  2024: [
    { overallConsultation: 52.8, visionConsultation: 61.2, visionSurgery: 18.4, cataractSurgery: 28.1 },
    { overallConsultation: 53.5, visionConsultation: 62.1, visionSurgery: 18.9, cataractSurgery: 28.8 },
    { overallConsultation: 54.6, visionConsultation: 63.4, visionSurgery: 19.7, cataractSurgery: 30.2 },
    { overallConsultation: 56.2, visionConsultation: 65.0, visionSurgery: 20.5, cataractSurgery: 31.4 },
    { overallConsultation: 55.4, visionConsultation: 64.1, visionSurgery: 20.1, cataractSurgery: 30.8 },
    { overallConsultation: 56.8, visionConsultation: 65.8, visionSurgery: 21.4, cataractSurgery: 32.6 },
    { overallConsultation: 58.1, visionConsultation: 67.4, visionSurgery: 22.7, cataractSurgery: 34.3 },
    { overallConsultation: 57.5, visionConsultation: 66.9, visionSurgery: 22.1, cataractSurgery: 33.8 },
    { overallConsultation: 56.9, visionConsultation: 66.1, visionSurgery: 21.8, cataractSurgery: 33.1 },
    { overallConsultation: 58.7, visionConsultation: 68.0, visionSurgery: 23.4, cataractSurgery: 35.6 },
    { overallConsultation: 59.2, visionConsultation: 68.6, visionSurgery: 23.9, cataractSurgery: 36.4 },
    { overallConsultation: 60.1, visionConsultation: 69.4, visionSurgery: 24.6, cataractSurgery: 37.8 },
  ],
  2025: [
    { overallConsultation: 55.3, visionConsultation: 63.9, visionSurgery: 20.1, cataractSurgery: 30.7 },
    { overallConsultation: 56.1, visionConsultation: 64.8, visionSurgery: 20.9, cataractSurgery: 31.5 },
    { overallConsultation: 57.4, visionConsultation: 66.2, visionSurgery: 21.6, cataractSurgery: 32.9 },
    { overallConsultation: 59.0, visionConsultation: 67.7, visionSurgery: 22.8, cataractSurgery: 34.2 },
    { overallConsultation: 58.4, visionConsultation: 67.1, visionSurgery: 22.3, cataractSurgery: 33.5 },
    { overallConsultation: 59.8, visionConsultation: 68.6, visionSurgery: 23.7, cataractSurgery: 35.1 },
    { overallConsultation: 61.4, visionConsultation: 70.2, visionSurgery: 25.1, cataractSurgery: 37.2 },
    { overallConsultation: 60.8, visionConsultation: 69.6, visionSurgery: 24.5, cataractSurgery: 36.4 },
    { overallConsultation: 60.2, visionConsultation: 68.9, visionSurgery: 24.1, cataractSurgery: 35.8 },
    { overallConsultation: 61.7, visionConsultation: 70.5, visionSurgery: 25.4, cataractSurgery: 37.9 },
    { overallConsultation: 62.1, visionConsultation: 71.0, visionSurgery: 25.8, cataractSurgery: 38.6 },
    { overallConsultation: 63.0, visionConsultation: 71.8, visionSurgery: 26.5, cataractSurgery: 39.4 },
  ],
  2026: [
    { overallConsultation: 57.2, visionConsultation: 66.1, visionSurgery: 21.8, cataractSurgery: 32.8 },
    { overallConsultation: 57.9, visionConsultation: 66.9, visionSurgery: 22.3, cataractSurgery: 33.6 },
    { overallConsultation: 58.8, visionConsultation: 68.0, visionSurgery: 23.0, cataractSurgery: 34.9 },
    { overallConsultation: 59.6, visionConsultation: 68.8, visionSurgery: 23.5, cataractSurgery: 35.7 },
    { overallConsultation: 59.1, visionConsultation: 68.2, visionSurgery: 23.2, cataractSurgery: 35.0 },
    { overallConsultation: 60.5, visionConsultation: 69.7, visionSurgery: 24.3, cataractSurgery: 36.4 },
    { overallConsultation: 62.0, visionConsultation: 71.3, visionSurgery: 25.6, cataractSurgery: 38.1 },
    { overallConsultation: 61.4, visionConsultation: 70.7, visionSurgery: 25.0, cataractSurgery: 37.3 },
    { overallConsultation: 61.9, visionConsultation: 71.1, visionSurgery: 25.5, cataractSurgery: 37.8 },
    { overallConsultation: 63.1, visionConsultation: 72.4, visionSurgery: 26.8, cataractSurgery: 39.5 },
    { overallConsultation: 63.6, visionConsultation: 72.9, visionSurgery: 27.2, cataractSurgery: 40.2 },
    { overallConsultation: 64.4, visionConsultation: 73.7, visionSurgery: 27.9, cataractSurgery: 41.0 },
  ],
}

const formatRate = (value: number) => `${value.toFixed(1)}%`

const periodData = (period: Period) =>
  mockData[period.year]?.[period.month] ?? {
    overallConsultation: 0,
    visionConsultation: 0,
    visionSurgery: 0,
    cataractSurgery: 0,
  }

const yearAverage = (year: number) => {
  const data = mockData[year] ?? []
  const valid = data.filter((item) =>
    Object.values(item).some((value) => value > 0)
  )

  if (!valid.length) {
    return {
      overallConsultation: 0,
      visionConsultation: 0,
      visionSurgery: 0,
      cataractSurgery: 0,
    }
  }

  return {
    overallConsultation: Number((valid.reduce((sum, item) => sum + item.overallConsultation, 0) / valid.length).toFixed(1)),
    visionConsultation: Number((valid.reduce((sum, item) => sum + item.visionConsultation, 0) / valid.length).toFixed(1)),
    visionSurgery: Number((valid.reduce((sum, item) => sum + item.visionSurgery, 0) / valid.length).toFixed(1)),
    cataractSurgery: Number((valid.reduce((sum, item) => sum + item.cataractSurgery, 0) / valid.length).toFixed(1)),
  }
}

const changePoint = (base: number, next: number) => next - base

export function ConsultationRatePage() {
  const filter = useFilterBar()
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['overallConsultation'])

  const { mode, periods, years } = filter
  const periodsData = useMemo(() => periods.map(periodData), [periods])
  const yearAverages = useMemo(() => years.map(yearAverage), [years])
  const activeMetrics = useMemo(
    () =>
      selectedMetrics.includes('overallConsultation')
        ? (['overallConsultation'] as MetricKey[])
        : selectedMetrics,
    [selectedMetrics],
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
    [periodsData],
  )

  const yearChartSeries = useMemo(() => {
    if (activeMetrics.includes('overallConsultation')) {
      return years.map((year, yearIndex) => ({
        key: `y${yearIndex}_overallConsultation`,
        label: `${year}년 · 전체 상담 전환율`,
        color: METRIC_COLORS.overallConsultation,
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
      }),
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

        years.forEach((year, yearIndex) => {
          const data = mockData[year]?.[monthIndex] ?? {
            overallConsultation: 0,
            visionConsultation: 0,
            visionSurgery: 0,
            cataractSurgery: 0,
          }

          if (activeMetrics.includes('overallConsultation')) {
            row[`y${yearIndex}_overallConsultation`] = data.overallConsultation
            return
          }

          activeMetrics.forEach((metricKey) => {
            row[`y${yearIndex}_${metricKey}`] = data[metricKey]
          })
        })

        return row
      }),
    [activeMetrics, years],
  )

  const toggleMetric = (metricKey: MetricKey) => {
    if (metricKey === 'overallConsultation') {
      setSelectedMetrics(['overallConsultation'])
      return
    }

    setSelectedMetrics((current) => {
      const currentWithoutOverall = current.filter((item) => item !== 'overallConsultation')
      const next = currentWithoutOverall.includes(metricKey)
        ? currentWithoutOverall.filter((item) => item !== metricKey)
        : [...currentWithoutOverall, metricKey]

      if (!next.length) {
        return ['overallConsultation']
      }

      return DETAIL_METRIC_KEYS.filter((key) => next.includes(key))
    })
  }

  return (
    <div className="space-y-6">
      <FilterBar {...filter} />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => {
          const values =
            mode === 'month'
              ? periodsData.map((data) => data[metric.key])
              : yearAverages.map((data) => data[metric.key])
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
                    {formatRate(base)}
                  </p>
                </div>
                {values.slice(1).map((value, index) => {
                  const change = changePoint(base, value)
                  const isPositive = change > 0
                  const isNeutral = change === 0
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
                          {change > 0 ? '+' : ''}
                          {change.toFixed(1)}%p
                        </span>
                        <span className="min-w-[7ch] text-right text-sm font-medium tabular-nums text-gray-700">
                          {formatRate(value)}
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
            <CardTitle>상담/수술 전환율 비교</CardTitle>
            <p className="text-sm text-muted-foreground">
              시력교정 상담 전환과 수술 전환, 백내장 수술 전환 흐름을 같은 기간 안에서 비교합니다.
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthChartConfig} className="h-80 w-full">
              <BarChart data={monthChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatAxisPercent}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => formatRate(Number(value))} />}
                />
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
                <CardTitle>월별 상담 전환율 추이</CardTitle>
                <p className="text-sm text-muted-foreground">
                  전체는 상담 전환율 흐름으로, 세부 전환율을 여러 개 선택하면 그래프가 분화됩니다.
                </p>
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
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatAxisPercent}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => formatRate(Number(value))} />}
                />
                {yearChartSeries.map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stroke={`var(--color-${series.key})`}
                    strokeWidth={activeMetrics.includes('overallConsultation') ? 2.75 : 2.25}
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
