import { useMemo } from 'react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PanelShell } from '@/components/PanelShell'
import {
  METRICS,
  EMPTY,
  type MonthlyData,
  computeRate,
  formatRate,
  changePoint,
} from './consultationRateUtils'
import { periodLabel } from '@/utils/stats'

interface KpiCardsPanelProps {
  dataMap: Record<number, MonthlyData[]>
  mode: string
  periods: Array<{ year: number; month: number }>
  years: number[]
  isLoading: boolean
  isError: boolean
}

export function KpiCardsPanel({
  dataMap,
  mode,
  periods,
  years,
  isLoading,
  isError,
}: KpiCardsPanelProps) {
  const periodsData = useMemo(
    () => periods.map((p) => dataMap[p.year]?.[p.month] ?? EMPTY),
    [periods, dataMap],
  )

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
            visionExamCount: 0,
            visionCounselCount: 0,
            visionSurgeryBooked: 0,
            cataractExamCount: 0,
            cataractSurgeryBooked: 0,
          },
        )

        return {
          ...sums,
          overallConsultation: computeRate(
            sums.visionSurgeryBooked + sums.cataractSurgeryBooked,
            sums.visionExamCount + sums.cataractExamCount,
          ),
          visionConsultation: computeRate(sums.visionCounselCount, sums.visionExamCount),
          visionSurgery: computeRate(sums.visionSurgeryBooked, sums.visionExamCount),
          cataractSurgery: computeRate(sums.cataractSurgeryBooked, sums.cataractExamCount),
        }
      }),
    [years, dataMap],
  )

  const renderCards = () => (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {METRICS.map((metric) => {
        const values =
          mode === 'month' ? periodsData.map((data) => data[metric.key]) : yearAverages.map((data) => data[metric.key])
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
  )

  return <PanelShell isLoading={isLoading} isError={isError} variant="kpi">{renderCards()}</PanelShell>
}
