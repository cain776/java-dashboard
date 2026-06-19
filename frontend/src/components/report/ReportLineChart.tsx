import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { MONTHS } from '@/constants/chart'
import { formatAxisNumber } from '@/utils/stats'

/**
 * 월간보고 PDF 색상 — 절대연도가 아닌 '당해연도 대비 위치'로 매핑(연도가 넘어가도 자동 유지).
 * 당해연도(기준) = 빨강 · 전년도 = 진회색 · 전전년도 = 연파랑
 */
const REPORT_YEAR_COLORS = ['#E11D2E', '#595959', '#9CC3D5']

/** latest = 당해연도(기준). latest-year(0=당해·1=전년·2=전전년)로 색을 고른다. */
const colorOf = (year: number, latest: number) => REPORT_YEAR_COLORS[latest - year] ?? '#6B7280'

export interface ReportLineChartProps {
  title: string
  /** 제목 옆 작은 부제 (예: "(소개 제외)") */
  suffix?: string
  years: number[]
  /** year → 12개월 값 배열 (없는 달은 null) */
  data: Record<number, (number | null)[]>
  format?: 'number' | 'percent'
}

export function ReportLineChart({ title, suffix, years, data, format = 'number' }: ReportLineChartProps) {
  const sorted = useMemo(() => [...years].sort((a, b) => a - b), [years])
  const latest = sorted[sorted.length - 1]

  const fmt = (v: number) => (format === 'percent' ? `${Math.round(v)}%` : formatAxisNumber(v))

  // 우측 합계 칼럼 = 차트 우측여백(80)과 같은 폭의 정렬용 칼럼. 숫자=합계 / 퍼센트=평균
  const summarize = (year: number): number | null => {
    const vals = (data[year] ?? []).filter((v): v is number => typeof v === 'number')
    if (!vals.length) return null
    const sum = vals.reduce((a, b) => a + b, 0)
    return format === 'percent' ? sum / vals.length : sum
  }

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    sorted.forEach((y) => {
      config[`y${y}`] = { label: `${y}`, color: colorOf(y, latest) }
    })
    return config
  }, [sorted, latest])

  const chartData = useMemo(
    () =>
      MONTHS.map((month, i) => {
        const row: Record<string, string | number | null> = { month }
        sorted.forEach((y) => {
          row[`y${y}`] = data[y]?.[i] ?? null
        })
        return row
      }),
    [sorted, data],
  )

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center gap-1 pb-2">
        <CardTitle className="text-center text-lg">
          {title}
          {suffix && <span className="text-sm font-medium text-muted-foreground"> {suffix}</span>}
        </CardTitle>
        <div className="flex flex-wrap items-center justify-center gap-5 pt-1">
          {sorted.map((y) => (
            <span
              key={y}
              className="flex items-center gap-1.5 text-sm font-bold"
              style={{ color: y === latest ? colorOf(y, latest) : '#374151' }}
            >
              <span className="h-[3px] w-7 rounded-full" style={{ backgroundColor: colorOf(y, latest) }} />
              {y}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChartContainer config={chartConfig} className="report-chart-area aspect-auto h-[480px] w-full">
          {/* YAxis 폭(80)·우측여백(80)을 테이블 colgroup(첫/끝 w-20=80px)과 맞춰 월이 표 칼럼 중앙에 정렬됨 */}
          <LineChart data={chartData} margin={{ top: 24, left: 0, right: 80 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" scale="band" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              width={80}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              domain={
                format === 'percent'
                  ? ['dataMin - 5', 'dataMax + 5']
                  : ['dataMin - 200', 'dataMax + 200']
              }
              tickFormatter={(v) => fmt(Number(v))}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {sorted.map((y) => (
              <Line
                key={y}
                type="monotone"
                dataKey={`y${y}`}
                stroke={colorOf(y, latest)}
                strokeWidth={y === latest ? 3 : 2.5}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4 }}
                label={
                  y === latest
                    ? {
                        position: 'bottom',
                        offset: 16,
                        fill: colorOf(y, latest),
                        fontSize: 14,
                        fontWeight: 700,
                        formatter: (value: unknown) =>
                          typeof value === 'number' ? fmt(value) : '',
                      }
                    : undefined
                }
              />
            ))}
          </LineChart>
        </ChartContainer>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] table-fixed border-collapse text-center text-xs">
            <colgroup>
              <col className="w-20" />
              {MONTHS.map((m) => (
                <col key={m} />
              ))}
              <col className="w-20" />
            </colgroup>
            <thead>
              <tr className="border-y border-border bg-muted/40">
                <th className="py-1.5" />
                {MONTHS.map((m) => (
                  <th key={m} className="py-1.5 font-semibold text-foreground">
                    {m}
                  </th>
                ))}
                <th className="py-1.5 font-semibold text-foreground">
                  {format === 'percent' ? '평균' : '합계'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((y) => {
                const summary = summarize(y)
                return (
                  <tr key={y} className="border-b border-border">
                    <td className="py-1.5 font-semibold" style={{ color: y === latest ? colorOf(y, latest) : undefined }}>
                      {y}
                    </td>
                    {MONTHS.map((_, i) => {
                      const v = data[y]?.[i]
                      return (
                        <td key={i} className="py-1.5 tabular-nums">
                          {typeof v === 'number' ? fmt(v) : ''}
                        </td>
                      )
                    })}
                    <td className="py-1.5 font-semibold tabular-nums">
                      {typeof summary === 'number' ? fmt(summary) : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
