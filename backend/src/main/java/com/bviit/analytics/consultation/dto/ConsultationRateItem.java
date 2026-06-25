package com.bviit.analytics.consultation.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 상담 전환율 월별 데이터 (레거시 BCRM 에브리데이 시스템 기준).
 *
 * 시력교정 (EXAM 테이블 기준):
 *   visionExamCount       — 검사자 수 (EXAM, CANCEL_CD 빈값)
 *   visionCounselCount    — 상담수 (STOP_YN<>Y AND BS지시 있음)
 *   visionSurgeryBooked   — 검사자 중 수술예약(FLAG=O) 존재하는 수
 *   visionActualSurgery   — 검사자 중 실제 수술(OPERATIONDATA) 완료 수
 *   visionSurgeryRate     — 수술전환율 = surgeryBooked / examCount × 100
 *   visionCounselRate     — 상담전환율 = surgeryBooked / counselCount × 100
 *
 * 백내장 (CUSTOM + RESERVATION FLAG=H 기준):
 *   cataractExamCount     — 백내장검사자 수 (DISTINCT CUST_NUM)
 *   cataractSurgeryBooked — 위 고객 중 수술예약(FLAG=O, JINRYO=4) 존재하는 수
 *   cataractStoppedCount  — 중단 (MY_optometrist 있음 AND MY_COUNSELOR='BS0808')
 *   cataractSurgeryRate   — 수술전환율 = surgeryBooked / examCount × 100
 */
@Getter
@Builder
public class ConsultationRateItem {
    private final int year;
    private final int month;

    // 시력교정
    private final int visionExamCount;
    private final int visionCounselCount;
    private final int visionSurgeryBooked;
    private final int visionActualSurgery;
    private final double visionSurgeryRate;
    private final double visionCounselRate;

    // 시력교정 상담성공률 원데이/일반 분해 (#21 3라인) + 일반 예약률 (#19)
    private final double visionCounselRateOneday;   // 원데이 상담성공률 = booked/counsel (원데이)
    private final double visionCounselRateGeneral;  // 일반 상담성공률 = booked/counsel (일반)
    private final double visionGeneralBookRate;     // 일반 예약률 = bookedGeneral / examGeneral (분모=검사, #19)

    // 백내장
    private final int cataractExamCount;
    private final int cataractSurgeryBooked;
    private final int cataractStoppedCount;
    private final double cataractSurgeryRate;
}
