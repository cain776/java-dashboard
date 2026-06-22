import { useMemo } from 'react'
import {
  Line,
  LineChart,
  CartesianGrid,
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
import { PanelShell } from '@/components/PanelShell'
import {
  SURGERY_TYPES,
  EMPTY_DATA,
  type MonthlyData,
} from './surgeryRatioUtils'
import { MONTHS } from '@/constants/chart'
import { formatAxisNumber } from '@/utils/stats'

interface TrendPanelProps {
  trendYear: number
  dataMap: Record<number, MonthlyData[]>
  isLoading: boolean
  isError: boolean
}

export function TrendPanel({
  trendYear,
  dataMap,
  isLoading,
  isError,
}: TrendPanelProps) {
  const yearData = useMemo(() => {
    const ms = dataMap[trendYear] ?? []
    const r = { ...EMPTY_DATA }
    for (const m of ms) for (const k of SURGERY_TYPES) r[k.key] += m[k.key]
    return r
  }, [trendYear, dataMap])

  const shareData = useMemo(
    () =>
      SURGERY_TYPES.map((type) => ({
        key: type.key,
        name: type.label,
        value: yearData[type.key],
      }))
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value),
    [yearData],
  )

  const topTrendKeys = useMemo(() => shareData.slice(0, 4).map((item) => item.key), [shareData])

  const topTrendConfig = useMemo(
    () =>
      Object.fromEntries(
        topTrendKeys.map((key) => {
          const type = SURGERY_TYPES.find((item) => item.key === key)
          return [
            key,
            {
              label: type?.label ?? key,
              color: type?.color ?? 'var(--chart-1)',
            },
          ]
        }),
      ) satisfies ChartConfig,
    [topTrendKeys],
  )

  const trendData = useMemo(
    () =>
      MONTHS.map((month, monthIndex) => {
        const row: Record<string, string | number> = { month }
        topTrendKeys.forEach((key) => {
          row[key] = dataMap[trendYear]?.[monthIndex]?.[key] ?? 0
        })
        return row
      }),
    [trendYear, topTrendKeys, dataMap],
  )

  const renderChart = () => (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>상위 수술 월별 추이</CardTitle>
        <CardDescription>{trendYear}년 기준 상위 4개 수술의 월별 추이입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={topTrendConfig} className="h-80 w-full">
          <LineChart data={trendData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
            <ChartLegend content={<ChartLegendContent />} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {topTrendKeys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2.5}
                dot={{ r: 4 }}
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
