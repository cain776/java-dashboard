import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf, withQuery } from '@/api/_shared'

/**
 * 예약통계시스템 — BCRM RSS 컨택통계 일자별 원시 카운트(CH01~CH24).
 * 백엔드: GET /api/stats/reservation-stats-system?from&to → ApiResponse<DailyCounts[]>.
 * 비율·총예약 등 파생값은 프론트(reservationStatsSystemData)가 동일 공식으로 계산한다.
 * 실 데이터는 mssql 프로파일에서만 — 미연결 시 503 → 호출부가 미연결 안내 표시.
 */
const dailyCountsSchema = z.object({
  date: z.string(),
  inboundCall: z.number(),
  answeredCall: z.number(),
  newInquiry: z.number(),
  callReservation: z.number(),
  tmTotalDb: z.number(),
  tmValidDb: z.number(),
  tmReservation: z.number(),
  tmRecounsel: z.number(),
  tmRecounselValid: z.number(),
  tmRecounselReservation: z.number(),
  homeReceived: z.number(),
  homeReservation: z.number(),
  naverReceived: z.number(),
  naverRejected: z.number(),
  naverValid: z.number(),
  naverReservation: z.number(),
  kakaoInquiry: z.number(),
  kakaoReservation: z.number(),
  cancelCallNaver: z.number(),
  cancelHome: z.number(),
  cancelKakao: z.number(),
  visit: z.number(),
  noShowReservation: z.number(),
  cancel: z.number(),
})

export type ReservationStatsDailyCounts = z.infer<typeof dailyCountsSchema>

const responseSchema = apiResponseOf(z.array(dailyCountsSchema))

/** 확정 월 요약: period + locked(PDF 고정이면 재확정 금지). */
const snapshotInfoSchema = z.object({ period: z.string(), locked: z.boolean() })
export type ReservationStatsSnapshotInfo = z.infer<typeof snapshotInfoSchema>

const snapshotsSchema = apiResponseOf(z.array(snapshotInfoSchema))

export const reservationStatsSystemApi = {
  getDailyCounts: async (from: string, to: string): Promise<ReservationStatsDailyCounts[]> => {
    const res = await api.get<unknown>(withQuery('/stats/reservation-stats-system', { from, to }))
    return responseSchema.parse(res).data
  },

  /** 확정(스냅샷)된 월 목록(period + locked). */
  getSnapshots: async (): Promise<ReservationStatsSnapshotInfo[]> => {
    const res = await api.get<unknown>('/stats/reservation-stats-system/snapshots')
    return snapshotsSchema.parse(res).data
  },

  /** 해당 월을 1회 조회해 JSON 스냅샷으로 확정 저장(월 전체 덮어쓰기). */
  saveSnapshot: async (period: string): Promise<void> => {
    await api.post<unknown>(withQuery('/stats/reservation-stats-system/snapshot', { period }), {})
  },

  /** 호출(증분 채움): 해당 월을 D-1까지 라이브 조회해 비어있는 날짜만 채운다(있으면 보존). */
  fillSnapshot: async (period: string): Promise<void> => {
    await api.post<unknown>(withQuery('/stats/reservation-stats-system/fill', { period }), {})
  },
}
