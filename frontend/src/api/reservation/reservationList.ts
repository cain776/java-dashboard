import { z } from 'zod'
import { api } from '@/api/client'

/**
 * 예약자 리스트 — "예약 종합(콜·온라인)" 월간 건수를 구성하는 검사예약 행 목록.
 * 백엔드: GET /api/reservation-list?from&to → ApiResponse<List<Map>> (camelCase 키).
 * 집계 기준 날짜 = 등록일(registeredAt). 행 1개 = RESERVE_NUM 1개. 월 합계 = 예약 종합 값.
 * 전 컬럼 문자열. reserveState: Y(예약)/I(접수)/H(퇴원)/C(취소).
 */
const reservationListItemSchema = z.object({
  registeredAt: z.string(),
  registeredTime: z.string(),
  reserveDate: z.string(),
  reserveTime: z.string(),
  chartNo: z.string(),
  name: z.string(),
  reserveState: z.string(),
  channel: z.string(), // 인콜/아웃콜/홈페이지/네이버
  channelGroup: z.string(), // 콜/온라인
  doctor: z.string(),
  counselor: z.string(),
  comment: z.string(),
})

export type ReservationListItem = z.infer<typeof reservationListItemSchema>

const reservationListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(reservationListItemSchema),
  message: z.string().nullish(),
})

export const reservationListApi = {
  getReservationList: async (from: string, to: string): Promise<ReservationListItem[]> => {
    const res = await api.get<unknown>(`/reservation-list?from=${from}&to=${to}`)
    return reservationListResponseSchema.parse(res).data
  },
}
