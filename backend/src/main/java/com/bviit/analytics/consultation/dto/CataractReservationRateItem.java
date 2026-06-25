package com.bviit.analytics.consultation.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * 월별 백내장 예약률 단일 행.
 *
 * 기준:
 *   examCount          = 백내장 검사건수와 동일한 Cataract_Exam 추천 눈(안) 수
 *   surgeryBookedCount = 위 검사건수 안에서 수술예약(RESERVATION O)이 있는 고객/예약 수
 *   reservationRate    = surgeryBookedCount / examCount * 100
 */
@Getter
@Builder
@Jacksonized
public class CataractReservationRateItem {
    private final int year;
    private final int month;
    private final int examCount;
    private final int surgeryBookedCount;
    private final double reservationRate;
}
