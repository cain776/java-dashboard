import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf } from '@/api/_shared'

/* ── Monthly (외래수 페이지용) ── */

const outpatientCountMonthlyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  outpatientCount: z.number().nullable(),
  total: z.number().nullable().optional(),
})
export type OutpatientCountMonthlyItem = z.infer<typeof outpatientCountMonthlyItemSchema>
const outpatientCountResponseSchema = apiResponseOf(z.array(outpatientCountMonthlyItemSchema))

export const outpatientApi = {
  getOutpatientCountMonthly: async (years: number[]) =>
    outpatientCountResponseSchema.parse(await api.get<unknown>(`/stats/outpatient-count/monthly?years=${years.join(',')}`)).data,
}
