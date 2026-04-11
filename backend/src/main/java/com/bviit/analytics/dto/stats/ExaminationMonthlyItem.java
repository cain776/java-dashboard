package com.bviit.analytics.dto.stats;

import lombok.Builder;
import lombok.Getter;

/**
 * 월별 검사 통계 단일 행.
 * 4개 검사 유형 + total.
 *
 * 카운트 기준: RESERVATION 테이블에서 RESERVE_STATE IN ('I','H') (실제 내원/완료)
 *   visionCorrection = RESERVE_FLAG = 'M' (시력교정 검사)
 *   cataract         = RESERVE_FLAG = 'H' (백내장 검사)
 *   dreamlens        = RESERVE_FLAG = 'D' (상담/드림렌즈)
 *   outpatient       = RESERVE_FLAG = 'F' (외래)
 */
@Getter
@Builder
public class ExaminationMonthlyItem {
    private final int year;
    private final int month;
    private final int visionCorrection;
    private final int cataract;
    private final int dreamlens;
    private final int outpatient;
    private final int total;
}
