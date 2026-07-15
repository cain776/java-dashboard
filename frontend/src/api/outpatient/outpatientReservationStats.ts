import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf, withQuery } from '@/api/_shared'
import {
  reservationStatsResponseMetaSchema,
  type ReservationStatsResponseMeta,
} from '@/api/reservation/reservationStatsMeta'

/**
 * 외래 예약통계 — 일자별 원시 카운트(콜/어플/현장/카톡/부도). 외래 = RESERVE_FLAG='F'.
 * 백엔드: GET /api/stats/outpatient-reservation-stats?from&to → ApiResponse<DailyCounts[]>.
 * 비율·총예약 등 파생값은 프론트(outpatientReservationStatsData)가 동일 공식으로 계산한다.
 * 실 데이터는 mssql 프로파일에서만 — 미연결 시 503 → 호출부가 미연결 안내 표시.
 * 필드명은 백엔드 DTO(OutpatientReservationStatsDailyRow) = 프론트 OutpatientStatsCounts와 1:1 일치.
 */
const dailyCountsSchema = z.object({
  date: z.string(),
  inboundCall: z.number(),
  answeredCall: z.number(),
  inquiryOnly: z.number(),
  reservationChange: z.number(),
  callReservation: z.number(),
  callCancel: z.number(),
  appReservation: z.number(),
  appCancel: z.number(),
  crmReservation: z.number(),
  crmCancel: z.number(),
  kakaoAll: z.number(),
  kakaoReservation: z.number(),
  kakaoCancel: z.number(),
  noShowCti: z.number(),
  noShowApp: z.number(),
  noShowCrm: z.number(),
})

export type OutpatientReservationStatsDailyCounts = z.infer<typeof dailyCountsSchema>
export type OutpatientReservationStatsDailyCountsResult = {
  data: OutpatientReservationStatsDailyCounts[]
  meta?: ReservationStatsResponseMeta
}

const responseSchema = apiResponseOf(z.array(dailyCountsSchema), reservationStatsResponseMetaSchema)

/** 확정 월 요약: period + locked(고정이면 재확정 금지). */
const snapshotInfoSchema = z.object({ period: z.string(), locked: z.boolean() })
export type OutpatientReservationStatsSnapshotInfo = z.infer<typeof snapshotInfoSchema>

const snapshotsSchema = apiResponseOf(z.array(snapshotInfoSchema))

const BASE = '/stats/outpatient-reservation-stats'

export const outpatientReservationStatsApi = {
  getDailyCounts: async (from: string, to: string): Promise<OutpatientReservationStatsDailyCountsResult> => {
    const res = await api.get<unknown>(withQuery(BASE, { from, to }))
    const parsed = responseSchema.parse(res)
    return { data: parsed.data, meta: parsed.meta }
  },

  /** 확정(스냅샷)된 월 목록(period + locked). */
  getSnapshots: async (): Promise<OutpatientReservationStatsSnapshotInfo[]> => {
    const res = await api.get<unknown>(`${BASE}/snapshots`)
    return snapshotsSchema.parse(res).data
  },

  /** 해당 월을 1회 조회해 JSON 스냅샷으로 확정 저장(월 전체 덮어쓰기). */
  saveSnapshot: async (period: string): Promise<void> => {
    await api.post<unknown>(withQuery(`${BASE}/snapshot`, { period }), {})
  },

  /** 호출(증분 채움): 해당 월을 D-1까지 라이브 조회해 비어있는 날짜만 채운다(있으면 보존). */
  fillSnapshot: async (period: string): Promise<void> => {
    await api.post<unknown>(withQuery(`${BASE}/fill`, { period }), {})
  },
}
