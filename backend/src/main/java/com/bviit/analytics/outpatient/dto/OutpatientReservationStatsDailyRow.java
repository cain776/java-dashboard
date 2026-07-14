package com.bviit.analytics.outpatient.dto;

/**
 * 외래 예약통계(BCRM RSS) 일자별 원시 카운트 1행 — 외래 = RESERVE_FLAG='F'.
 *
 * 비율·총예약 등 파생값은 프론트(outpatientReservationStatsData)가 집계(일→주→월) 후 동일 공식으로
 * 계산하므로 여기서는 원시 카운트만 담는다. 채널: 콜(CtiRptLst)·어플/현장/부도(RESERVATION).
 * 미배선 칸(인입/응대콜·문의만·카톡)은 라이브에서 0으로 온다(스펙: BCRM_RSS_외래·백내장_260512).
 */
public record OutpatientReservationStatsDailyRow(
        String date,             // 예약(등록)일 yyyy-MM-dd
        int inboundCall,         // 콜 총 인입콜 (EICN, ⏳ 미배선)
        int answeredCall,        // 콜 응대콜 (EICN, ⏳ 미배선)
        int inquiryOnly,         // 콜 문의만 (상담등록, ⏳ 미배선)
        int appReservation,      // 어플 예약
        int appCancel,           // 어플 취소
        int crmReservation,      // 현장(CRM) 예약
        int crmCancel,           // 현장(CRM) 취소
        int reservationChange,   // 콜 예약변경 (CtiGbnCod='A')
        int callReservation,     // 콜 예약 (CtiGbnCod='M')
        int callCancel,          // 콜 취소 (CtiGbnCod='C')
        int kakaoAll,            // 카톡 모든상담 (⏳ 미배선)
        int kakaoReservation,    // 카톡 예약 (⏳ 미배선)
        int kakaoCancel,         // 카톡 취소 (⏳ 미배선)
        int noShowCti,           // 부도 CTI
        int noShowApp,           // 부도 어플
        int noShowCrm            // 부도 현장(CRM)
) {
}
