package com.bviit.analytics.dto.surgery;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;
import lombok.Builder;
import lombok.Getter;

/**
 * 월별 수술 통계 단일 행 (환자 수 기준, 레거시 stats-weekly-report.js 준용).
 *
 * 모든 카운트는 COUNT(DISTINCT CUST_NUM) 기준 — 한 환자가 여러 유형 수술을 받으면
 * 각 유형에 중복 카운트됨 (예: SMILE R + LASIK L → smile+1, lasik+1).
 *
 * 그룹:
 *   refractive (시력교정): lasek, lasik, smile, smilePro
 *   lens (렌즈/각막):      icl, tIcl, kpl, tKpl, viva
 *   cataract (백내장):     catMulti, catMono, catEdof
 *
 * 총 환자 수:
 *   visionPatients   — OPERATIONDATA 기준 DISTINCT CUST_NUM (백내장 환자 제외)
 *   cataractPatients — Cataract_Operationdata 기준 DISTINCT CUST_NUM
 *   total            — visionPatients + cataractPatients (비중 계산용 분모)
 */
@Getter
@Builder
@JsonAutoDetect(
    fieldVisibility = Visibility.ANY,
    getterVisibility = Visibility.NONE,
    isGetterVisibility = Visibility.NONE
)
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

    // 그룹별 환자 수 (DISTINCT)
    private final int visionPatients;
    private final int cataractPatients;

    // 총 환자 수 (비중 계산용 분모)
    private final int total;
}
