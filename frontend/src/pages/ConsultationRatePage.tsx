import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Minus, TrendingDown, TrendingUp } from 'lucide-react'
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
import { formatAxisPercent, periodLabel } from '@/utils/stats'
import { statsApi, type ConsultationRateItem } from '@/api/stats'

type MetricKey =
  | 'overallConsultation'
  | 'visionConsultation'
  | 'visionSurgery'
  | 'cataractSurgery'

interface MonthlyData {
  // 화면 표시용 비율 (%)
  overallConsultation: number
  visionConsultation: number
  visionSurgery: number
  cataractSurgery: number
  // 가중평균 집계용 원본 건수
  visionExamCount: number
  visionCounselCount: number
  visionSurgeryBooked: number
  cataractExamCount: number
  cataractSurgeryBooked: number
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

const EMPTY_RATES: MonthlyData = {
  overallConsultation: 0, visionConsultation: 0, visionSurgery: 0, cataractSurgery: 0,
  visionExamCount: 0, visionCounselCount: 0, visionSurgeryBooked: 0,
  cataractExamCount: 0, cataractSurgeryBooked: 0,
}

// 비율(%) 계산 — 분모 0 방어
const computeRate = (numerator: number, denominator: number) =>
  denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(1)) : 0

// 백엔드 DTO → 화면용 필드 매핑 (원본 건수 유지 → 가중평균 집계 가능)
function itemToData(item: ConsultationRateItem): MonthlyData {
  return {
    overallConsultation: computeRate(
      item.visionSurgeryBooked + item.cataractSurgeryBooked,
      item.visionExamCount + item.cataractExamCount,
    ),
    visionConsultation: item.visionCounselRate,
    visionSurgery: item.visionSurgeryRate,
    cataractSurgery: item.cataractSurgeryRate,
    visionExamCount: item.visionExamCount,
    visionCounselCount: item.visionCounselCount,
    visionSurgeryBooked: item.visionSurgeryBooked,
    cataractExamCount: item.cataractExamCount,
    cataractSurgeryBooked: item.cataractSurgeryBooked,
  }
}

function toDataMap(items: ConsultationRateItem[]): Record<number, MonthlyData[]> {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY_RATES }))
    map[item.year][item.month - 1] = itemToData(item)
  }
  return map
}

const formatRate = (value: number) => `${value.toFixed(1)}%`

const changePoint = (base: number, next: number) => next - base

export function ConsultationRatePage() {
  const filter = useFilterBar()
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['overallConsultation'])

  const { mode, periods, years } = filter

  // 필요한 연도 수집
  const queryYears = useMemo(() => {
    const set = new Set<number>()
    if (mode === 'month') periods.forEach((p) => set.add(p.year))
    else years.forEach((y) => set.add(y))
    return [...set].sort()
  }, [mode, periods, years])

  // API 호출
  const { data: apiItems, isLoading, isError } = useQuery({
    queryKey: ['consultation-rate', queryYears],
    queryFn: () => statsApi.getConsultationRate(queryYears),
    enabled: queryYears.length > 0,
  })

  const dataMap = useMemo(() => (apiItems ? toDataMap(apiItems) : {}), [apiItems])
  const periodsData = useMemo(
    () => periods.map((period) => dataMap[period.year]?.[period.month] ?? EMPTY_RATES),
    [periods, dataMap],
  )
  // 연도별 집계는 가중평균: SUM(분자) / SUM(분모) × 100
  // 단순 월별 비율 평균은 표본 크기 차이를 왜곡하므로 금지.
  const yearAverages = useMemo<MonthlyData[]>(
    () =>
      years.map((year) => {
        const months = dataMap[year] ?? []
        const sums = months.reduce(
          (acc, m) => ({
            visionExamCount: acc.visionExamCount + m.visionExamCount,
            visionCounselCount: acc.visionCounselCount + m.visionCounselCount,
            visionSurgeryBooked: acc.visionSurgeryBooked + m.visionSurgeryBooked,
            cataractExamCount: acc.cataractExamCount + m.cataractExamCount,
            cataractSurgeryBooked: acc.cataractSurgeryBooked + m.cataractSurgeryBooked,
          }),
          {
            visionExamCount: 0, visionCounselCount: 0, visionSurgeryBooked: 0,
            cataractExamCount: 0, cataractSurgeryBooked: 0,
          },
        )

        return {
          ...sums,
          overallConsultation: computeRate(
            sums.visionSurgeryBooked + sums.cataractSurgeryBooked,
            sums.visionExamCount + sums.cataractExamCount,
          ),
          visionConsultation: computeRate(sums.visionSurgeryBooked, sums.visionCounselCount),
          visionSurgery: computeRate(sums.visionSurgeryBooked, sums.visionExamCount),
          cataractSurgery: computeRate(sums.cataractSurgeryBooked, sums.cataractExamCount),
        }
      }),
    [years, dataMap],
  )
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
          const data = dataMap[year]?.[monthIndex] ?? EMPTY_RATES

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
    [activeMetrics, years, dataMap],
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

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">데이터를 불러오는 중...</span>
        </div>
      )}
      {isError && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="py-6 text-center text-sm text-destructive">
            데이터를 불러오지 못했습니다. 백엔드 서버를 확인해주세요.
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      </section>}

      {!isLoading && !isError && (mode === 'month' ? (
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
      ))}
    </div>
  )
}
