import type { ReservationStatsDailyCounts } from '@/api/reservation/reservationStatsSystem'
import { pctInt } from '../shared/reservationStatsCore'

export type SystemStatsCounts = Omit<ReservationStatsDailyCounts, 'date'>

/** 채널별 한 주(또는 합계) 행 — 키 순서가 표 컬럼 순서와 일치한다. */
export interface ChannelRow {
  label: string
  totalReservation: number // 총예약

  // 콜 › 검사 인입콜
  inboundCall: number // 인입콜
  answeredCall: number // 응대콜
  answerRate: number // 응대율(%)
  newInquiry: number // 신규예약문의
  newInquiryRate: number // 신규문의 비율(%)
  callReservation: number // 예약수
  reservationVsNewInquiry: number // 신규문의 대비 예약율(%)
  callReservationRate: number // 예약율(%)

  // 콜 › TM
  tmTotalDb: number // 총 DB
  tmValidDb: number // 유효 DB
  tmReservation: number // 예약수
  tmValidDbRate: number // 유효 DB 예약율(%)
  tmReservationRate: number // 예약율(%)
  tmRecounsel: number // 재상담
  tmRecounselRatio: number // 총 DB 중 재상담비율(%)
  tmRecounselValid: number // 재상담 유효수
  tmRecounselReservation: number // 예약수
  tmRecounselRate: number // 예약율(%)

  // 온라인 › 홈페이지
  homeReceived: number // 예약접수
  homeReservation: number // 예약수
  homeReservationRate: number // 예약율(%)

  // 온라인 › 네이버
  naverReceived: number // 예약접수(RESERVATION 등록일 카운트)
  naverRejected: number // 파트너거절(RESERVATION_NAVER 확정전 취소) — 유효접수 = 예약접수 − 파트너거절
  naverValid: number // 유효접수(접수−거절)
  naverReservation: number // 예약수(유효−사용자취소(네이버취소))
  naverValidRate: number // 유효접수 예약율(%)
  naverReservationRate: number // 예약율(%)

  // 채팅 › 카카오톡
  kakaoInquiry: number // 문의
  kakaoReservation: number // 예약수
  kakaoReservationRate: number // 예약율(%)

  // 취소
  cancelCallNaver: number // 콜·네이버
  cancelHome: number // 홈페이지
  cancelKakao: number // 카톡
}

/** 예약율류 공통 분모(콜 유입 기준). */
const denom = (counts: SystemStatsCounts): number =>
  counts.inboundCall +
  counts.tmTotalDb +
  counts.tmRecounsel +
  counts.homeReservation +
  Math.max(0, counts.naverReservation) +
  counts.kakaoReservation

export const computeSystemChannelRow = (counts: SystemStatsCounts, label: string): ChannelRow => {
  const denominator = denom(counts)
  // 네이버 유효/예약은 일별(접수0인 날 거절만 있는 휴무일)에 음수가 될 수 있어 표시 시 0으로 클램프.
  // 주/월 합계는 원시(음수 포함) 합이 정확하므로, 양수인 합계 행에는 영향이 없다.
  const naverValid = Math.max(0, counts.naverValid)
  const naverReservation = Math.max(0, counts.naverReservation)
  return {
    label,
    // 총예약 = 각 채널 예약수 합(인입콜 제외) — CH04+CH07+CH10+CH12+CH16+CH18
    totalReservation:
      counts.callReservation + counts.tmReservation + counts.tmRecounselReservation +
      counts.homeReservation + naverReservation + counts.kakaoReservation,
    inboundCall: counts.inboundCall,
    answeredCall: counts.answeredCall,
    answerRate: pctInt(counts.answeredCall, counts.inboundCall),
    newInquiry: counts.newInquiry,
    newInquiryRate: pctInt(counts.newInquiry, counts.answeredCall),
    callReservation: counts.callReservation,
    reservationVsNewInquiry: pctInt(counts.callReservation, counts.newInquiry),
    callReservationRate: pctInt(counts.callReservation, denominator),
    tmTotalDb: counts.tmTotalDb,
    tmValidDb: counts.tmValidDb,
    tmReservation: counts.tmReservation,
    tmValidDbRate: pctInt(counts.tmReservation, counts.tmValidDb),
    tmReservationRate: pctInt(counts.tmReservation, denominator),
    tmRecounsel: counts.tmRecounsel,
    tmRecounselRatio: pctInt(counts.tmRecounsel, counts.tmTotalDb),
    tmRecounselValid: counts.tmRecounselValid,
    tmRecounselReservation: counts.tmRecounselReservation,
    tmRecounselRate: pctInt(counts.tmRecounselReservation, denominator),
    homeReceived: counts.homeReceived,
    homeReservation: counts.homeReservation,
    homeReservationRate: pctInt(counts.homeReservation, denominator),
    naverReceived: counts.naverReceived,
    naverRejected: counts.naverRejected,
    naverValid,
    naverReservation,
    naverValidRate: pctInt(naverReservation, naverValid),
    naverReservationRate: pctInt(naverReservation, denominator),
    kakaoInquiry: counts.kakaoInquiry,
    kakaoReservation: counts.kakaoReservation,
    kakaoReservationRate: pctInt(counts.kakaoReservation, denominator),
    cancelCallNaver: counts.cancelCallNaver,
    cancelHome: counts.cancelHome,
    cancelKakao: counts.cancelKakao,
  }
}
