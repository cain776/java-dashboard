import { z } from 'zod'
import { api } from './client'

export interface ReservationStatsParams {
  from: string
  to: string
}

const reservationTrendItemSchema = z.object({
  date: z.string(),
  reservations: z.number(),
  examinations: z.number(),
  cancellations: z.number(),
})

const reservationSourceItemSchema = z.object({
  source: z.enum(['phone', 'naver', 'kakao', 'walkIn', 'referral']),
  label: z.string(),
  count: z.number(),
})

const reservationHourlyItemSchema = z.object({
  slot: z.string(),
  count: z.number(),
})

const reservationStatsResponseSchema = z.object({
  data: z.object({
    summary: z.object({
      totalReservations: z.number(),
      reservationChangeRate: z.number(),
      completedExaminations: z.number(),
      examinationConversionRate: z.number(),
      cancellations: z.number(),
      cancellationRate: z.number(),
      walkInReservations: z.number(),
      walkInShareRate: z.number(),
    }),
    dailyTrend: z.array(reservationTrendItemSchema),
    sourceBreakdown: z.array(reservationSourceItemSchema),
    hourlyDistribution: z.array(reservationHourlyItemSchema),
  }),
  meta: z.object({
    from: z.string(),
    to: z.string(),
    mock: z.boolean(),
  }),
})

export type ReservationStatsResponse = z.infer<typeof reservationStatsResponseSchema>

const buildQueryString = (params: ReservationStatsParams) =>
  new URLSearchParams({
    from: params.from,
    to: params.to,
  }).toString()

/* ── 공통 응답 래퍼 ── */

function apiResponseOf<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({ success: z.boolean(), data: itemSchema })
}


/* ── KPI (예약 KPI 카드용) ── */

const reservationKpiItemSchema = z.object({
  year: z.number(), surgery: z.number(), outpatient: z.number(),
  dreamlens: z.number(), total: z.number(),
})
export type ReservationKpiItem = z.infer<typeof reservationKpiItemSchema>
const reservationKpiResponseSchema = apiResponseOf(z.array(reservationKpiItemSchema))

/* ── Monthly (예약 건수 페이지용) ── */

const reservationMonthlyItemSchema = z.object({
  year: z.number(), month: z.number(), surgery: z.number(),
  outpatient: z.number(), dreamlens: z.number(), total: z.number(),
})
export type ReservationMonthlyItem = z.infer<typeof reservationMonthlyItemSchema>
const reservationMonthlyResponseSchema = apiResponseOf(z.array(reservationMonthlyItemSchema))

/* ── Monthly (수술 건수 페이지용) ── */

const surgeryMonthlyItemSchema = z.object({
  year: z.number(), month: z.number(),
  lasek: z.number(), lasik: z.number(), smile: z.number(), smilePro: z.number(),
  icl: z.number(), tIcl: z.number(), kpl: z.number(), tKpl: z.number(), viva: z.number(),
  catMulti: z.number(), catMono: z.number(), catEdof: z.number(),
  total: z.number(),
})
export type SurgeryMonthlyItem = z.infer<typeof surgeryMonthlyItemSchema>
const surgeryMonthlyResponseSchema = apiResponseOf(z.array(surgeryMonthlyItemSchema))

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

/* ── Monthly (검사 건수 페이지용) ── */

const examinationMonthlyItemSchema = z.object({
  year: z.number(), month: z.number(),
  visionCorrection: z.number(),
  dreamlens: z.number(),
  examTotal: z.number().optional(), total: z.number(),
})
export type ExaminationMonthlyItem = z.infer<typeof examinationMonthlyItemSchema>
const examinationResponseSchema = apiResponseOf(z.array(examinationMonthlyItemSchema))

/* ── 상담 전환율 페이지용 ── */

const consultationRateItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  // 시력교정
  visionExamCount: z.number(),
  visionCounselCount: z.number(),
  visionSurgeryBooked: z.number(),
  visionActualSurgery: z.number(),
  visionSurgeryRate: z.number(),
  visionCounselRate: z.number(),
  // 백내장
  cataractExamCount: z.number(),
  cataractSurgeryBooked: z.number(),
  cataractStoppedCount: z.number(),
  cataractSurgeryRate: z.number(),
})

const consultationRateResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(consultationRateItemSchema),
})

export type ConsultationRateItem = z.infer<typeof consultationRateItemSchema>

export const statsApi = {
  getReservationStats: async (
    params: ReservationStatsParams
  ): Promise<ReservationStatsResponse> => {
    const response = await api.get<unknown>(`/stats/reservation?${buildQueryString(params)}`)
    return reservationStatsResponseSchema.parse(response)
  },

  getSurgeryMonthly: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(`/stats/surgery/monthly?years=${years.join(',')}`)).data,

  /** 수술별 비중 — real은 전용 API, mock은 panel composition 응답 재사용 */
  getSurgeryRatio: async (years: number[], mock = false) => {
    const endpoint = mock
      ? `/stats/surgery/composition?years=${years.join(',')}&mock=true`
      : `/stats/surgery-ratio?years=${years.join(',')}`
    return surgeryMonthlyResponseSchema.parse(await api.get<unknown>(endpoint)).data
  },

  getReservationMonthly: async (years: number[]) =>
    reservationMonthlyResponseSchema.parse(await api.get<unknown>(`/stats/reservation/monthly?years=${years.join(',')}`)).data,

  getReservationKpi: async (years: number[], mock = true) =>
    reservationKpiResponseSchema.parse(await api.get<unknown>(`/stats/reservation/kpi?years=${years.join(',')}&mock=${mock}`)).data,

  getReservationTrend: async (years: number[], mock = true) =>
    reservationMonthlyResponseSchema.parse(await api.get<unknown>(`/stats/reservation/trend?years=${years.join(',')}&mock=${mock}`)).data,

  getReservationComposition: async (years: number[], mock = true) =>
    reservationMonthlyResponseSchema.parse(await api.get<unknown>(`/stats/reservation/composition?years=${years.join(',')}&mock=${mock}`)).data,

  getExaminationMonthly: async (years: number[]) =>
    examinationResponseSchema.parse(await api.get<unknown>(`/stats/examination/monthly?years=${years.join(',')}`)).data,

  getConsultationRate: async (years: number[]) =>
    consultationRateResponseSchema.parse(await api.get<unknown>(`/stats/consultation-rate?years=${years.join(',')}`)).data,

  getExaminationKpi: async (years: number[], mock = true) =>
    examinationResponseSchema.parse(await api.get<unknown>(`/stats/examination/kpi?years=${years.join(',')}&mock=${mock}`)).data,

  getExaminationTrend: async (years: number[], mock = true) =>
    examinationResponseSchema.parse(await api.get<unknown>(`/stats/examination/trend?years=${years.join(',')}&mock=${mock}`)).data,

  getExaminationComposition: async (years: number[], mock = true) =>
    examinationResponseSchema.parse(await api.get<unknown>(`/stats/examination/composition?years=${years.join(',')}&mock=${mock}`)).data,

  getSurgeryKpi: async (years: number[], mock = true) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(`/stats/surgery/kpi?years=${years.join(',')}&mock=${mock}`)).data,

  getSurgeryTrend: async (years: number[], mock = true) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(`/stats/surgery/trend?years=${years.join(',')}&mock=${mock}`)).data,

  getSurgeryComposition: async (years: number[], mock = true) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(`/stats/surgery/composition?years=${years.join(',')}&mock=${mock}`)).data,

  getConsultationRateKpi: async (years: number[], mock = true) =>
    consultationRateResponseSchema.parse(await api.get<unknown>(`/stats/consultation-rate/kpi?years=${years.join(',')}&mock=${mock}`)).data,

  getConsultationRateTrend: async (years: number[], mock = true) =>
    consultationRateResponseSchema.parse(await api.get<unknown>(`/stats/consultation-rate/trend?years=${years.join(',')}&mock=${mock}`)).data,

  getConsultationRateComposition: async (years: number[], mock = true) =>
    consultationRateResponseSchema.parse(await api.get<unknown>(`/stats/consultation-rate/composition?years=${years.join(',')}&mock=${mock}`)).data,

  getB2bRevenueMonthly: async (years: number[]) =>
    b2bRevenueResponseSchema.parse(await api.get<unknown>(`/stats/b2b-revenue?years=${years.join(',')}`)).data,
}
