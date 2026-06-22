package com.bviit.analytics.dto.reservation;

import lombok.Builder;
import lombok.Getter;

/**
 * 월별 유입(검사예약) 통계 단일 행.
 *
 * 채널 매핑:
 *   incall   = RESERVE_PATH 'CTI'
 *   outcall  = RESERVE_PATH 'CRM'
 *   kakao    = RESERVE_PATH 'KAKAO'
 *   naver    = RESERVE_PATH 'NAVER'
 *   homepage = RESERVE_PATH 'ONLINE' + 'APP'
 *
 * 집계 대상:
 *   RESERVATION 기준, 취소 제외(RESERVE_STATE <> 'C'),
 *   검사/외래 계열 예약(RESERVE_FLAG IN ('M','H','D','F'))만 포함.
 */
@Getter
@Builder
public class IntakeConversionMonthlyItem {
    private final int year;
    private final int month;
    private final int incall;
    private final int outcall;
    private final int kakao;
    private final int naver;
    private final int homepage;
    private final int total;
}
