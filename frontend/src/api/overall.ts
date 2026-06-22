import { z } from 'zod'
import { api } from './client'
import { apiResponseOf } from './_shared'

/* ── Weekly (주간 검사자 종합지표 페이지용) ── */

const overallExamWeeklyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  week: z.number(),
  partial: z.boolean(),
  startDate: z.string(),
  endDate: z.string(),
  totalExam: z.number(),
  introGeneral: z.number(),
  introCustomer: z.number(),
  introStaff: z.number(),
  jobOffice: z.number(),
  jobStudent: z.number(),
  jobEtc: z.number(),
  visionBooked: z.number(),
  cataractTotal: z.number(),
  cataractOnly: z.number(),
  cataractBooked: z.number(),
  stopCount: z.number(),
  visionExam: z.number(),
  dreamlens: z.number(),
  oneDay: z.number(),
  oneDayBooked: z.number(),
})
export type OverallExamWeeklyItem = z.infer<typeof overallExamWeeklyItemSchema>
const overallExamWeeklyResponseSchema = apiResponseOf(z.array(overallExamWeeklyItemSchema))

export const overallApi = {
  getOverallExamWeekly: async (years: number[]) =>
    overallExamWeeklyResponseSchema.parse(await api.get<unknown>(`/stats/overall-exam/weekly?years=${years.join(',')}`)).data,
}
