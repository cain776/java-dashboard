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
import { PanelShell } from '@/components/PanelShell'
import { StatsGrid } from '@/components/layout/desktop/StatsGrid'
import { StatsStack } from '@/components/layout/mobile/StatsStack'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useExaminationKpi } from '@/hooks/useExaminationKpi'
import { useExaminationTrend } from '@/hooks/useExaminationTrend'
import { useExaminationComposition } from '@/hooks/useExaminationComposition'
import { CHART_COLORS, MONTHS, YEAR_STROKE_PATTERNS } from '@/constants/chart'
import { changeRate, formatAxisNumber, periodLabel } from '@/utils/stats'

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

const EMPTY: MonthlyData = {
  visionCorrection: 0,
  cataract: 0,
  dreamlens: 0,
  outpatient: 0,
}

const withTotal = (data: MonthlyData): WithTotal => ({
  ...data,
  total: data.visionCorrection + data.cataract + data.dreamlens + data.outpatient,
})

function KpiCardsPanel({
  dataMap,
  mode,
  periods,
  years,
  isLoading,
  isError,
}: {
  dataMap: Record<number, MonthlyData[]>
  mode: string
  periods: Array<{ year: number; month: number }>
  years: number[]
  isLoading: boolean
  isError: boolean
}) {
  const periodsData = useMemo(
    () => periods.map((p) => withTotal(dataMap[p.year]?.[p.month] ?? EMPTY)),
    [periods, dataMap],
  )
  const yearTotals = useMemo(
    () =>
      years.map((year) => {
        const months = dataMap[year] ?? []
        const sum = { ...EMPTY }
        for (const m of months) {
          sum.visionCorrection += m.visionCorrection
          sum.cataract += m.cataract
          sum.dreamlens += m.dreamlens
          sum.outpatient += m.outpatient
        }
        return withTotal(sum)
      }),
    [years, dataMap],
  )

  const renderCards = () => (
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
  )

  return <PanelShell isLoading={isLoading} isError={isError} variant="kpi">{renderCards()}</PanelShell>
}

function MonthComparePanel({
  dataMap,
  periods,
  isLoading,
  isError,
}: {
  dataMap: Record<number, MonthlyData[]>
  periods: Array<{ year: number; month: number }>
  isLoading: boolean
  isError: boolean
}) {
  const periodsData = useMemo(
    () => periods.map((p) => withTotal(dataMap[p.year]?.[p.month] ?? EMPTY)),
    [periods, dataMap],
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

  const renderChart = () => (
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
  )

  return <PanelShell isLoading={isLoading} isError={isError} variant="bar">{renderChart()}</PanelShell>
}

function YearTrendPanel({
  dataMap,
  years,
  isLoading,
  isError,
}: {
  dataMap: Record<number, MonthlyData[]>
  years: number[]
  isLoading: boolean
  isError: boolean
}) {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['total'])

  const activeMetrics = useMemo(
    () => (selectedMetrics.includes('total') ? (['total'] as MetricKey[]) : selectedMetrics),
    [selectedMetrics],
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
      activeMetrics.map((metricKey: MetricKey) => {
        const metric = METRICS.find((item) => item.key === metricKey)

        return {
          key: `y${yearIndex}_${metricKey}`,
          label: `${year}年 · ${metric?.label ?? metricKey}`,
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
        years.forEach((year, index) => {
          const data = withTotal(dataMap[year]?.[monthIndex] ?? EMPTY)

          if (activeMetrics.includes('total')) {
            row[`y${index}_total`] = data.total
            return
          }

          activeMetrics.forEach((metricKey: MetricKey) => {
            if (metricKey !== 'total') {
              row[`y${index}_${metricKey}`] = data[metricKey]
            }
          })
        })
        return row
      }),
    [activeMetrics, years, dataMap],
  )

  const toggleMetric = (metricKey: MetricKey) => {
    if (metricKey === 'total') {
      setSelectedMetrics(['total'])
      return
    }

    setSelectedMetrics((current: MetricKey[]) => {
      const currentWithoutTotal = current.filter((item) => item !== 'total')
      const next = currentWithoutTotal.includes(metricKey)
        ? currentWithoutTotal.filter((item) => item !== metricKey)
        : [...currentWithoutTotal, metricKey]

      if (!next.length) {
        return ['total']
      }

      return DETAIL_METRIC_KEYS.filter((key) => (next as MetricKey[]).includes(key))
    })
  }

  const renderChart = () => (
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
  )

  return <PanelShell isLoading={isLoading} isError={isError} variant="line">{renderChart()}</PanelShell>
}

export function ExaminationPage() {
  const filter = useFilterBar()
  const isMobile = useIsMobile()
  const { mode, periods, years } = filter

  const queryYears = useMemo(() => {
    const set = new Set<number>()
    if (mode === 'month') periods.forEach((p) => set.add(p.year))
    else years.forEach((y) => set.add(y))
    return [...set].sort()
  }, [mode, periods, years])

  const kpiQuery = useExaminationKpi(queryYears)
  const trendQuery = useExaminationTrend(queryYears)
  const compositionQuery = useExaminationComposition(queryYears)

  const kpiDataMap = useMemo(
    () =>
      kpiQuery.data
        ? kpiQuery.data.reduce(
            (map, item) => {
              if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
              map[item.year][item.month - 1] = {
                visionCorrection: item.visionCorrection,
                cataract: item.cataract,
                dreamlens: item.dreamlens,
                outpatient: item.outpatient,
              }
              return map
            },
            {} as Record<number, MonthlyData[]>,
          )
        : {},
    [kpiQuery.data],
  )

  const Container = isMobile ? StatsStack : StatsGrid

  return (
    <div className="space-y-6">
      <FilterBar {...filter} />
      <Container>
        <KpiCardsPanel
          dataMap={kpiDataMap}
          mode={mode}
          periods={periods}
          years={years}
          isLoading={kpiQuery.isLoading}
          isError={kpiQuery.isError}
        />
        {mode === 'month' ? (
          <MonthComparePanel
            dataMap={compositionQuery.dataMap}
            periods={periods}
            isLoading={compositionQuery.isLoading}
            isError={compositionQuery.isError}
          />
        ) : (
          <YearTrendPanel
            dataMap={trendQuery.dataMap}
            years={years}
            isLoading={trendQuery.isLoading}
            isError={trendQuery.isError}
          />
        )}
      </Container>
    </div>
  )
}
