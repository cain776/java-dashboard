package com.bviit.analytics.consultation.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * 검사 중단 사유 — 월별 단일 행.
 *
 * 검사 중단(EXAM.STOP_YN='Y') 건을 정형 중단사유 코드(EXAM.CANCEL_CD, 마스터 CANCEL_CFG)로 분류한 사유별 건수.
 * 상담사가 드롭다운으로 고른 코드라 골든/PDF 차트와 정합(2026-06 prod 전 항목 완전 일치).
 *   잠정 중단 그룹: other(기타) · glaucoma(녹내장) · visionChange(시력변화)
 *   수술 불가 그룹: recommendX(수술권유X) · lensImpossible(렌즈삽입불가) · keratoconus(원추각막) · avellino(아벨리노)
 * total = 모든 사유 합 = EXAM.STOP_YN='Y' 월별 건수(전체지표 종합표 '중단수'와 동일).
 *
 * 매핑 규칙·수정 방법·검증 쿼리는 docs/기획/중단사유-분류-정의.md 참조. 분류는 SQL(find-stop-reason-monthly.sql) 한 곳.
 * ⚠️ 구 EXAM_MEMO 자유텍스트 키워드 추정 방식은 2026-07-14(fd54e30) 폐기 — "사유 코드가 DB에 없다"는 옛 전제는 틀렸다.
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
