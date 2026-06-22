package com.bviit.analytics.dto.exam;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * 시술별 검사 건수 — 월별 단일 행.
 *
 * 카운트 기준 (레거시 "검사수" 차트 정의와 동일):
 *   examCount = EXAM 검사자 행수 + Cataract_Exam 검사 세션수 (둘 다 raw COUNT(*), 필터 없음)
 *   oneDayExamCount = EXAM 기준 검사OP(M/5) 내원 + 중단/취소 제외
 *
 * 2024~2025는 레거시 확정값을 고정 사용하고, 2026년 이후는 prod DB 계산값을 사용한다.
 * total은 API 호환용이며 examCount와 동일하다.
 */
@Getter
@Builder
@Jacksonized
public class ProcedureExamMonthlyItem {
    private final int year;
    private final int month;
    private final int examCount;
    private final int oneDayExamCount;
    private final int total;
}
