package com.bviit.analytics.dto.stats;

import lombok.Builder;
import lombok.Getter;

/**
 * 상담 전환율 월별 데이터.
 *
 * 시력교정 수술전환율  = visionSurgeryCount / visionExamCount
 * 시력교정 상담전환율  = visionSurgeryCount / visionCounselCount
 *   (상담수 = 검사 - 중단(STOP_YN=Y) - BS미지시(OPERATIONR+L 빈값))
 * 백내장 수술전환율   = cataractSurgeryCount / cataractExamCount
 */
@Getter
@Builder
public class ConsultationRateItem {
    private final int year;
    private final int month;
    // 시력교정 수술전환율 (검사 대비)
    private final int visionExamCount;
    private final int visionSurgeryCount;
    private final double visionSurgeryRate;
    // 시력교정 상담전환율 (중단·BS미지시 제외)
    private final int visionCounselCount;
    private final double visionCounselRate;
    // 백내장 수술전환율
    private final int cataractExamCount;
    private final int cataractSurgeryCount;
    private final double cataractSurgeryRate;
}
