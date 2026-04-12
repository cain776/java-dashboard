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

/* ── KPI (예약 KPI 카드용) ── */

export interface ReservationKpiItem {
  year: number
  surgery: number
  outpatient: number
  dreamlens: number
  total: number
}

/* ── Monthly (예약 건수 페이지용) ── */

export interface ReservationMonthlyItem {
  year: number
  month: number
  surgery: number
  outpatient: number
  dreamlens: number
  total: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

/* ── Monthly (수술 건수 페이지용) ── */

export interface SurgeryMonthlyItem {
  year: number
  month: number
  lasek: number; lasik: number; smile: number; smilePro: number
  icl: number; tIcl: number; kpl: number; tKpl: number; viva: number
  catMulti: number; catMono: number; catEdof: number
  total: number
}

/* ── Monthly (검사 건수 페이지용) ── */

export interface ExaminationMonthlyItem {
  year: number
  month: number
  visionCorrection: number
  cataract: number
  dreamlens: number
  outpatient: number
  total: number
}

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

  getSurgeryMonthly: async (
    years: number[]
  ): Promise<SurgeryMonthlyItem[]> => {
    const res = await api.get<ApiResponse<SurgeryMonthlyItem[]>>(
      `/stats/surgery/monthly?years=${years.join(',')}`
    )
    return res.data
  },

  getSurgeryRatio: async (
    years: number[]
  ): Promise<SurgeryMonthlyItem[]> => {
    const res = await api.get<ApiResponse<SurgeryMonthlyItem[]>>(
      `/stats/surgery-ratio?years=${years.join(',')}`
    )
    return res.data
  },

  getReservationMonthly: async (
    years: number[]
  ): Promise<ReservationMonthlyItem[]> => {
    const res = await api.get<ApiResponse<ReservationMonthlyItem[]>>(
      `/stats/reservation/monthly?years=${years.join(',')}`
    )
    return res.data
  },

  getReservationKpi: async (
    years: number[], mock = true
  ): Promise<ReservationKpiItem[]> => {
    const res = await api.get<ApiResponse<ReservationKpiItem[]>>(
      `/stats/reservation/kpi?years=${years.join(',')}&mock=${mock}`
    )
    return res.data
  },

  getReservationTrend: async (
    years: number[], mock = true
  ): Promise<ReservationMonthlyItem[]> => {
    const res = await api.get<ApiResponse<ReservationMonthlyItem[]>>(
      `/stats/reservation/trend?years=${years.join(',')}&mock=${mock}`
    )
    return res.data
  },

  getReservationComposition: async (
    years: number[], mock = true
  ): Promise<ReservationMonthlyItem[]> => {
    const res = await api.get<ApiResponse<ReservationMonthlyItem[]>>(
      `/stats/reservation/composition?years=${years.join(',')}&mock=${mock}`
    )
    return res.data
  },

  getExaminationMonthly: async (
    years: number[]
  ): Promise<ExaminationMonthlyItem[]> => {
    const res = await api.get<ApiResponse<ExaminationMonthlyItem[]>>(
      `/stats/examination/monthly?years=${years.join(',')}`
    )
    return res.data
  },

  getConsultationRate: async (
    years: number[]
  ): Promise<ConsultationRateItem[]> => {
    const response = await api.get<unknown>(
      `/stats/consultation-rate?years=${years.join(',')}`
    )
    return consultationRateResponseSchema.parse(response).data
  },

  /* ── Examination KPI (검사 건수 KPI 카드용) ── */
  getExaminationKpi: async (
    years: number[], mock = true
  ): Promise<ExaminationMonthlyItem[]> => {
    const res = await api.get<ApiResponse<ExaminationMonthlyItem[]>>(
      `/stats/examination/kpi?years=${years.join(',')}&mock=${mock}`
    )
    return res.data
  },

  /* ── Examination Trend (검사 건수 트렌드 차트용) ── */
  getExaminationTrend: async (
    years: number[], mock = true
  ): Promise<ExaminationMonthlyItem[]> => {
    const res = await api.get<ApiResponse<ExaminationMonthlyItem[]>>(
      `/stats/examination/trend?years=${years.join(',')}&mock=${mock}`
    )
    return res.data
  },

  /* ── Examination Composition (검사 건수 구성 차트용) ── */
  getExaminationComposition: async (
    years: number[], mock = true
  ): Promise<ExaminationMonthlyItem[]> => {
    const res = await api.get<ApiResponse<ExaminationMonthlyItem[]>>(
      `/stats/examination/composition?years=${years.join(',')}&mock=${mock}`
    )
    return res.data
  },

  /* ── Surgery KPI (수술 건수 KPI 카드용) ── */
  getSurgeryKpi: async (
    years: number[], mock = true
  ): Promise<SurgeryMonthlyItem[]> => {
    const res = await api.get<ApiResponse<SurgeryMonthlyItem[]>>(
      `/stats/surgery/kpi?years=${years.join(',')}&mock=${mock}`
    )
    return res.data
  },

  /* ── Surgery Trend (수술 건수 트렌드 차트용) ── */
  getSurgeryTrend: async (
    years: number[], mock = true
  ): Promise<SurgeryMonthlyItem[]> => {
    const res = await api.get<ApiResponse<SurgeryMonthlyItem[]>>(
      `/stats/surgery/trend?years=${years.join(',')}&mock=${mock}`
    )
    return res.data
  },

  /* ── Surgery Composition (수술 건수 구성 차트용) ── */
  getSurgeryComposition: async (
    years: number[], mock = true
  ): Promise<SurgeryMonthlyItem[]> => {
    const res = await api.get<ApiResponse<SurgeryMonthlyItem[]>>(
      `/stats/surgery/composition?years=${years.join(',')}&mock=${mock}`
    )
    return res.data
  },

  /* ── ConsultationRate KPI (상담 전환율 KPI 카드용) ── */
  getConsultationRateKpi: async (
    years: number[], mock = true
  ): Promise<ConsultationRateItem[]> => {
    const response = await api.get<unknown>(
      `/stats/consultation-rate/kpi?years=${years.join(',')}&mock=${mock}`
    )
    return consultationRateResponseSchema.parse(response).data
  },

  /* ── ConsultationRate Trend (상담 전환율 트렌드 차트용) ── */
  getConsultationRateTrend: async (
    years: number[], mock = true
  ): Promise<ConsultationRateItem[]> => {
    const response = await api.get<unknown>(
      `/stats/consultation-rate/trend?years=${years.join(',')}&mock=${mock}`
    )
    return consultationRateResponseSchema.parse(response).data
  },

  /* ── ConsultationRate Composition (상담 전환율 구성 차트용) ── */
  getConsultationRateComposition: async (
    years: number[], mock = true
  ): Promise<ConsultationRateItem[]> => {
    const response = await api.get<unknown>(
      `/stats/consultation-rate/composition?years=${years.join(',')}&mock=${mock}`
    )
    return consultationRateResponseSchema.parse(response).data
  },
}
