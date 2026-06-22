package com.bviit.analytics.dto.consultation;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * 검사 중단 사유 — 월별 단일 행.
 *
 * 검사 중단(EXAM.STOP_YN='Y') 건을 EXAM_MEMO 키워드로 자동 분류한 사유별 건수.
 * ⚠️ 사유 코드가 DB에 없어 자유텍스트(EXAM_MEMO) 키워드 매칭으로 추정 — 직원 수동분류와 다를 수 있다.
 *   공백·개행·약어 표기 차이(렌삽/ICL, 권유안/비권유/수술불가 등)를 보정해 분류한다.
 *   잠정 중단 그룹: other(기타) · glaucoma(녹내장) · visionChange(시력변화)
 *   수술 불가 그룹: recommendX(수술권유X) · lensImpossible(렌즈삽입불가) · keratoconus(원추각막) · avellino(아벨리노)
 * total = 모든 사유 합 = EXAM.STOP_YN='Y' 월별 건수(전체지표 종합표 '중단수'와 동일).
 */
@Getter
@Builder
@Jacksonized
public class StopReasonMonthlyItem {
    private final int year;
    private final int month;
    private final int recommendX;
    private final int lensImpossible;
    private final int keratoconus;
    private final int avellino;
    private final int glaucoma;
    private final int visionChange;
    private final int other;
    private final int total;
}
