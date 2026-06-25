package com.bviit.analytics.exam.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * 월별 검사 통계 단일 행 — 시력교정/드림렌즈/백내장 + 화면 전체.
 *
 * 카운트 기준 (확정 정의: docs/db/지표정의.md §1):
 *   visionCorrection = 시력교정검사. 2024~2025는 레거시 확정값, 이후는 EXAM 기준
 *   dreamlens        = EXAM 검사자 리스트 행, 사람 단위 (렌즈센터 D만 있고 검사 M이 없는 행)
 *   cataract         = 백내장검사. 2024~2025는 레거시 확정값, 이후는 추천 수술방법이 입력된 눈 단위
 *   examTotal        = 화면 "전체" 검사건수. visionCorrection + dreamlens + cataract
 *
 * 주의: 레거시 확정값은 전체가 아니라 세부 카테고리(시력교정/백내장)에만 적용한다.
 * total은 API 호환용이며 examTotal과 동일하다.
 */
@Getter
@Builder
@Jacksonized
public class ExaminationMonthlyItem {
    private final int year;
    private final int month;
    private final int visionCorrection;
    private final int dreamlens;
    private final int cataract;
    private final int examTotal;
    private final int total;
}
