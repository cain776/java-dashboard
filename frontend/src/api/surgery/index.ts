import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf } from '@/api/_shared'

/* ── Monthly (수술 건수 페이지용) ── */

const surgeryMonthlyItemSchema = z.object({
  year: z.number(), month: z.number(),
  lasek: z.number(), lasik: z.number(), smile: z.number(), smilePro: z.number(),
  icl: z.number(), tIcl: z.number(), kpl: z.number(), tKpl: z.number(), viva: z.number(),
  catMulti: z.number(), catMono: z.number(), catEdof: z.number(),
  xtra: z.number().optional(), waveVision: z.number().optional(), monoVision: z.number().optional(),
  contra: z.number().optional(), personal: z.number().optional(),
  lasekEx: z.number().optional(), lasekRed: z.number().optional(),
  reoperation: z.number().optional(), reopLaser: z.number().optional(), reopLens: z.number().optional(),
  visionPatients: z.number().optional(), cataractPatients: z.number().optional(),
  total: z.number(),
})
export type SurgeryMonthlyItem = z.infer<typeof surgeryMonthlyItemSchema>
const surgeryMonthlyResponseSchema = apiResponseOf(z.array(surgeryMonthlyItemSchema))

export const surgeryApi = {
  getSurgeryMonthly: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(`/stats/surgery/monthly?years=${years.join(',')}`)).data,

  /** 수술별 비중 — real은 전용 API, mock은 panel composition 응답 재사용 */
  getSurgeryRatio: async (years: number[], mock = false) => {
    const endpoint = mock
      ? `/stats/surgery/composition?years=${years.join(',')}&mock=true`
      : `/stats/surgery-ratio?years=${years.join(',')}`
    return surgeryMonthlyResponseSchema.parse(await api.get<unknown>(endpoint)).data
  },

  getSurgeryKpi: async (years: number[], mock = true) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(`/stats/surgery/kpi?years=${years.join(',')}&mock=${mock}`)).data,

  getSurgeryTrend: async (years: number[], mock = true) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(`/stats/surgery/panel/trend?years=${years.join(',')}&mock=${mock}`)).data,

  getSurgeryComposition: async (years: number[], mock = true) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(`/stats/surgery/panel/composition?years=${years.join(',')}&mock=${mock}`)).data,
}
