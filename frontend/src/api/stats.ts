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
}
