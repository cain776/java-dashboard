package com.bviit.analytics.dto.reservation;

import lombok.Builder;
import lombok.Getter;

/**
 * 월별 예약 통계 단일 행.
 * flat 배열 [{year, month, surgery, outpatient, dreamlens, total}, ...]
 */
@Getter
@Builder
public class ReservationMonthlyItem {
    private final int year;
    private final int month;
    private final int surgery;
    private final int outpatient;
    private final int dreamlens;
    private final int total;
}
