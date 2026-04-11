package com.bviit.analytics.dto.stats;

import lombok.Builder;
import lombok.Getter;

/**
 * 월별 수술 통계 단일 행.
 * 12개 수술 유형 + 3개 그룹 소계 + total.
 *
 * 그룹:
 *   refractive (시력교정): lasek, lasik, smile, smilePro
 *   lens (렌즈/각막):      icl, tIcl, kpl, tKpl, viva
 *   cataract (백내장):     catMulti, catMono, catEdof
 */
@Getter
@Builder
public class SurgeryMonthlyItem {
    private final int year;
    private final int month;

    // 시력교정
    private final int lasek;
    private final int lasik;
    private final int smile;
    private final int smilePro;

    // 렌즈/각막
    private final int icl;
    private final int tIcl;
    private final int kpl;
    private final int tKpl;
    private final int viva;

    // 백내장
    private final int catMulti;
    private final int catMono;
    private final int catEdof;

    // 합계
    private final int total;
}
