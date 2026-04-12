import { useMemo } from 'react'
import { FilterBar } from '@/components/filters/FilterBar'
import { useFilterBar } from '@/components/filters/useFilterBar'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSurgeryRatioComposition } from '@/hooks/useSurgeryRatioComposition'
import { useSurgeryRatioTrend } from '@/hooks/useSurgeryRatioTrend'
import { KpiCardsPanel } from './surgery-ratio/KpiCardsPanel'
import { CompositionPanel } from './surgery-ratio/CompositionPanel'
import { TrendPanel } from './surgery-ratio/TrendPanel'
import { SURGERY_TYPES, EMPTY_DATA, toYearMap } from './surgery-ratio/surgeryRatioUtils'
import { periodLabel, type Period } from '@/utils/stats'

export function SurgeryRatioPage() {
  const filter = useFilterBar()
  useIsMobile()

  const requestedYears = useMemo(() => {
    if (filter.mode === 'month') {
      return [...new Set(filter.periods.map((p) => p.year))].sort()
    }
    return [...filter.years].sort()
  }, [filter.mode, filter.periods, filter.years])

  const compositionQuery = useSurgeryRatioComposition(requestedYears)
  const trendQuery = useSurgeryRatioTrend(requestedYears)

  const dataMap = useMemo(
    () => (compositionQuery.data ? toYearMap(compositionQuery.data) : {}),
    [compositionQuery.data],
  )

  const pData = (p: Period) => dataMap[p.year]?.[p.month] ?? EMPTY_DATA
  const yearSumData = (year: number) => {
    const ms = dataMap[year] ?? []
    const r = { ...EMPTY_DATA }
    for (const m of ms) for (const k of SURGERY_TYPES) r[k.key] += m[k.key]
    return r
  }

  const selectedData = filter.mode === 'month' ? pData(filter.periods[0]) : yearSumData(filter.years[0])
  const trendYear = filter.mode === 'month' ? filter.periods[0].year : filter.years[0]
  const baseLabel = filter.mode === 'month' ? periodLabel(filter.periods[0]) : `${filter.years[0]}년`

  return (
    <div className="space-y-6">
      <FilterBar {...filter} />
      <KpiCardsPanel
        selectedData={selectedData}
        baseLabel={baseLabel}
        isLoading={compositionQuery.isLoading}
        isError={compositionQuery.isError}
      />
      <CompositionPanel
        selectedData={selectedData}
        baseLabel={baseLabel}
        isLoading={compositionQuery.isLoading}
        isError={compositionQuery.isError}
      />
      <TrendPanel
        trendYear={trendYear}
        dataMap={dataMap}
        isLoading={trendQuery.isLoading}
        isError={trendQuery.isError}
      />
    </div>
  )
}
