package com.bviit.analytics.reservation.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * 예약통계_백내장 — 일자별 원시 카운트 1행.
 *
 * 백내장(노안 포함) 검사예약을 인바운드(컨택센터)·아웃바운드(TM)·채팅(카카오톡)·온라인·취소
 * 채널로 분해한 카운트. 비율·합계·총예약건 등 파생값은 프론트가 집계(일→주→월) 후 동일
 * 공식으로 계산하므로 여기서는 원시 카운트만 담는다.
 *
 * 채널 구성이 시력교정(ReservationStatsDailyRow)과 달라 별도 스키마로 둔다.
 *
 * manualEdits: 셀 수기 보정 이력(없으면 직렬화 생략). 라이브 집계가 어긋나는 날을 손보정하면 남는다.
 */
public record CataractStatsDailyRow(
        String date,                    // 예약(등록)일 yyyy-MM-dd
        // 총 예약(아웃바운드 포함) — 합계 = 백내장 + 노안(파생)
        int totalCataract,              // 백내장 총예약
        int totalPresbyopia,            // 노안 총예약
        // 인바운드(컨택센터)
        int inboundCall,                // 총 인입콜
        int answeredCall,               // 응대콜
        int newExamInquiry,             // 백내장 총 신규검사문의
        int newReInquiry,               // 백내장 신규 재문의
        int newPatient,                 // 백내장 ★신환
        // 아웃바운드(TM) — 아웃바운드 총 예약수 = tmReservation(파생)
        int tmTotalDb,                  // 총 DB
        int tmValidDb,                  // 유효 DB
        int tmReservation,              // 예약수
        // 채팅(카카오톡)
        int kakaoTotalInquiry,          // 총문의(모든)
        int kakaoCataractReservation,   // 백내장 검사예약
        int kakaoPresbyopiaReservation, // 노안 검사예약
        // 온라인예약
        int onlineReservation,          // 예약수
        int onlineNoShow,               // 부도수
        // 취소
        int cancelOnline,               // 온라인
        int cancelCrm,                  // 컨택센터 현장(CRM)
        int cancelKakao,                // 카톡
        // 종합(내원·부도·취소) — 방문일 기준
        int visit,                      // 내원
        int noShowReservation,          // 예약(부도)
        int cancel,                     // 취소
        // 수기 보정 이력(비어있으면 JSON 직렬화 생략) — 이 일자에서 손보정한 셀 목록
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<CataractStatsCellEdit> manualEdits
) {

    public CataractStatsDailyRow {
        manualEdits = manualEdits == null ? List.of() : List.copyOf(manualEdits);
    }

    /** 라이브 조회/기존 코드용 — 수기 보정 이력 없이 생성. */
    public CataractStatsDailyRow(
            String date,
            int totalCataract, int totalPresbyopia,
            int inboundCall, int answeredCall,
            int newExamInquiry, int newReInquiry, int newPatient,
            int tmTotalDb, int tmValidDb, int tmReservation,
            int kakaoTotalInquiry, int kakaoCataractReservation, int kakaoPresbyopiaReservation,
            int onlineReservation, int onlineNoShow,
            int cancelOnline, int cancelCrm, int cancelKakao,
            int visit, int noShowReservation, int cancel
    ) {
        this(date, totalCataract, totalPresbyopia, inboundCall, answeredCall,
                newExamInquiry, newReInquiry, newPatient,
                tmTotalDb, tmValidDb, tmReservation,
                kakaoTotalInquiry, kakaoCataractReservation, kakaoPresbyopiaReservation,
                onlineReservation, onlineNoShow,
                cancelOnline, cancelCrm, cancelKakao,
                visit, noShowReservation, cancel, List.of());
    }
}
