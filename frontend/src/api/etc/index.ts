import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf } from '@/api/_shared'

/* ── Monthly (B2B 매출 페이지용) ── */

const b2bRevenueMonthlyItemSchema = z.object({
  year: z.number(), month: z.number(),
  totalRevenue: z.number(), caseCount: z.number(), avgRevenuePerCase: z.number(),
  visionRevenue: z.number(), cataractRevenue: z.number(),
  visionCount: z.number(), cataractCount: z.number(),
  designatedRevenue: z.number(), nonDesignatedRevenue: z.number(),
  designatedCount: z.number(), nonDesignatedCount: z.number(),
  opCost: z.number(), examCost: z.number(), dnaCost: z.number(),
  prpCost: z.number(), etcCost: z.number(),
  presbyopiaCost: z.number(), hospitalSupplyCost: z.number(),
})
export type B2bRevenueMonthlyItem = z.infer<typeof b2bRevenueMonthlyItemSchema>
const b2bRevenueResponseSchema = apiResponseOf(z.array(b2bRevenueMonthlyItemSchema))

export const b2bApi = {
  getB2bRevenueMonthly: async (years: number[]) =>
    b2bRevenueResponseSchema.parse(await api.get<unknown>(`/stats/b2b-revenue?years=${years.join(',')}`)).data,
}
