import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf, withQuery } from '@/api/_shared'

/**
 * 예약통계_백내장 — 일자별 원시 카운트.
 * 백엔드: GET /api/stats/reservation-stats-cataract?from&to → ApiResponse<DailyCounts[]>.
 * 비율·합계·총예약건 등 파생값은 프론트(reservationStatsCataractData)가 동일 공식으로 계산한다.
 * 라이브 집계 쿼리는 아직 없어 데이터는 PDF 스냅샷(JSON)으로 채운다 — 미연결 시 503 → 시드 폴백.
 */
const dailyCountsSchema = z.object({
  date: z.string(),
  totalCataract: z.number(),
  totalPresbyopia: z.number(),
  inboundCall: z.number(),
  answeredCall: z.number(),
  newExamInquiry: z.number(),
  newReInquiry: z.number(),
  newPatient: z.number(),
  tmTotalDb: z.number(),
  tmValidDb: z.number(),
  tmReservation: z.number(),
  kakaoTotalInquiry: z.number(),
  kakaoCataractReservation: z.number(),
  kakaoPresbyopiaReservation: z.number(),
  onlineReservation: z.number(),
  onlineNoShow: z.number(),
  cancelOnline: z.number(),
  cancelCrm: z.number(),
  cancelKakao: z.number(),
  visit: z.number(),
  noShowReservation: z.number(),
  cancel: z.number(),
})

export type CataractStatsDailyCounts = z.infer<typeof dailyCountsSchema>

const responseSchema = apiResponseOf(z.array(dailyCountsSchema))

/** 확정 월 요약: period + locked(PDF 고정이면 재확정 금지). */
const snapshotInfoSchema = z.object({ period: z.string(), locked: z.boolean() })
export type CataractStatsSnapshotInfo = z.infer<typeof snapshotInfoSchema>

const snapshotsSchema = apiResponseOf(z.array(snapshotInfoSchema))

export const reservationStatsCataractApi = {
  getDailyCounts: async (from: string, to: string): Promise<CataractStatsDailyCounts[]> => {
    const res = await api.get<unknown>(withQuery('/stats/reservation-stats-cataract', { from, to }))
    return responseSchema.parse(res).data
  },

  /** 확정(스냅샷)된 월 목록(period + locked). */
  getSnapshots: async (): Promise<CataractStatsSnapshotInfo[]> => {
    const res = await api.get<unknown>('/stats/reservation-stats-cataract/snapshots')
    return snapshotsSchema.parse(res).data
  },

  /** 호출(증분 채움): 해당 월을 D-1까지 라이브 조회해 비어있는 날짜만 채운다(있으면 보존). */
  fillSnapshot: async (period: string): Promise<void> => {
    await api.post<unknown>(withQuery('/stats/reservation-stats-cataract/fill', { period }), {})
  },
}
