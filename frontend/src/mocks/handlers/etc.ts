import { http, HttpResponse } from 'msw'
import { parseYears } from './shared'

const getB2bRevenueData = (years: number[]) =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const caseCount = 18 + ((year + month * 3) % 17)
      const visionCount = Math.round(caseCount * 0.62)
      const cataractCount = caseCount - visionCount
      const opCost = caseCount * (1_350_000 + (month % 4) * 75_000)
      const examCost = caseCount * 90_000
      const dnaCost = Math.round(caseCount * 0.35) * 120_000
      const prpCost = Math.round(caseCount * 0.22) * 180_000
      const etcCost = caseCount * 45_000
      const presbyopiaCost = cataractCount * 240_000
      const hospitalSupplyCost = caseCount * 38_000
      const totalRevenue =
        opCost + examCost + dnaCost + prpCost + etcCost + presbyopiaCost + hospitalSupplyCost
      const designatedCount = Math.round(caseCount * 0.45)
      const nonDesignatedCount = caseCount - designatedCount
      return {
        year,
        month,
        totalRevenue,
        caseCount,
        avgRevenuePerCase: Math.round(totalRevenue / caseCount),
        visionRevenue: Math.round(totalRevenue * 0.64),
        cataractRevenue: Math.round(totalRevenue * 0.36),
        visionCount,
        cataractCount,
        designatedRevenue: Math.round(totalRevenue * 0.48),
        nonDesignatedRevenue: Math.round(totalRevenue * 0.52),
        designatedCount,
        nonDesignatedCount,
        opCost,
        examCost,
        dnaCost,
        prpCost,
        etcCost,
        presbyopiaCost,
        hospitalSupplyCost,
      }
    }),
  )

export const etcHandlers = [
  http.get('/api/stats/b2b-revenue', ({ request }) =>
    HttpResponse.json({ success: true, data: getB2bRevenueData(parseYears(request)) }),
  ),
]
