import { type ComponentProps } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

export interface TrendLine {
  /** config 키 = 색 매핑(`var(--color-${key})`) = data row의 dataKey */
  key: string
  /** 기본 2.5 */
  strokeWidth?: number
  /** '' 또는 미지정이면 실선 */
  strokeDasharray?: string
  /** 기본 { r: 4 }, false면 점 숨김 */
  dot?: boolean | { r: number }
}

interface TrendLineChartProps {
  config: ChartConfig
  data: Array<Record<string, string | number>>
  lines: TrendLine[]
  yTickFormatter: (value: number | string) => string
  tooltipFormatter?: ComponentProps<typeof ChartTooltipContent>['formatter']
  /** x축 dataKey (기본 'month') */
  xKey?: string
  className?: string
}

/**
 * 통계 Trend 라인차트 공용 골격 (ChartContainer + LineChart).
 * Card·헤더·PanelShell은 페이지가 소유한다 — 헤더가 패널마다 다르기 때문(단순 vs 지표 토글).
 * 색은 config 키 기준 `var(--color-${line.key})`로 자동 매핑.
 */
export function TrendLineChart({
  config,
  data,
  lines,
  yTickFormatter,
  tooltipFormatter,
  xKey = 'month',
  className = 'h-80 w-full',
}: TrendLineChartProps) {
  return (
    <ChartContainer config={config} className={className}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={yTickFormatter} />
        <ChartLegend content={<ChartLegendContent />} />
        <ChartTooltip content={<ChartTooltipContent formatter={tooltipFormatter} />} />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={`var(--color-${line.key})`}
            strokeWidth={line.strokeWidth ?? 2.5}
            strokeDasharray={line.strokeDasharray || undefined}
            dot={line.dot ?? { r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
