package com.bviit.analytics.outpatient.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * 외래수 — 월별 단일 행.
 *
 * 현재 기준:
 *   - 2024~2025: 레거시 차트 확정값 고정
 *   - 2026: 레거시 확인값(1~4월) 우선 입력, 미확인 월은 null
 *
 * 운영 DB 산출 기준 확정 전까지 레거시 입력값을 공식 표시값으로 사용한다.
 */
@Getter
@Builder
@Jacksonized
public class OutpatientCountMonthlyItem {
    private final int year;
    private final int month;
    private final Integer outpatientCount;
    private final Integer total;
}
