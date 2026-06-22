import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf } from '@/api/_shared'

/* ── Monthly (검사 건수 페이지용) ── */

const examinationMonthlyItemSchema = z.object({
  year: z.number(), month: z.number(),
  visionCorrection: z.number(),
  dreamlens: z.number(),
  cataract: z.number().optional(),
  examTotal: z.number().optional(), total: z.number(),
})
export type ExaminationMonthlyItem = z.infer<typeof examinationMonthlyItemSchema>
const examinationResponseSchema = apiResponseOf(z.array(examinationMonthlyItemSchema))

/* ── Monthly (시술별 검사 건수 페이지용) ── */

const procedureExamMonthlyItemSchema = z.object({
  year: z.number(), month: z.number(),
  examCount: z.number(),
  oneDayExamCount: z.number(),
  total: z.number().optional(),
})
export type ProcedureExamMonthlyItem = z.infer<typeof procedureExamMonthlyItemSchema>
const procedureExamResponseSchema = apiResponseOf(z.array(procedureExamMonthlyItemSchema))

export const examApi = {
  getExaminationMonthly: async (years: number[]) =>
    examinationResponseSchema.parse(await api.get<unknown>(`/stats/examination/monthly?years=${years.join(',')}`)).data,

  getProcedureExamMonthly: async (years: number[]) =>
    procedureExamResponseSchema.parse(await api.get<unknown>(`/stats/procedure-exam/monthly?years=${years.join(',')}`)).data,

  getExaminationKpi: async (years: number[], mock = true) =>
    examinationResponseSchema.parse(await api.get<unknown>(`/stats/examination/kpi?years=${years.join(',')}&mock=${mock}`)).data,

  getExaminationTrend: async (years: number[], mock = true) =>
    examinationResponseSchema.parse(await api.get<unknown>(`/stats/examination/trend?years=${years.join(',')}&mock=${mock}`)).data,

  getExaminationComposition: async (years: number[], mock = true) =>
    examinationResponseSchema.parse(await api.get<unknown>(`/stats/examination/composition?years=${years.join(',')}&mock=${mock}`)).data,
}
