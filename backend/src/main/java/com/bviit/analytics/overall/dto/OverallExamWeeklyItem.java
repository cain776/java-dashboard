package com.bviit.analytics.overall.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * 검사자 종합표 — 주간(월~일, 월 경계 클립) 단일 행.
 *
 * 주 정의: 월요일~일요일. 월 경계를 걸치는 주는 월 경계에서 잘라 각 달에 귀속한다
 * (월 합계 = 그 달 주 합계로 정확히 일치). 1일~첫 월요일 직전의 선행 부분 구간은 첫 정규 주에
 * 합쳐 1주로 만들며(1주 = 1일~첫 일요일), 마지막 주만 부분 주가 될 수 있다.
 *
 * 모든 값은 운영 DB 라이브 집계다(2024~2025 레거시 고정값은 월 단위라 주 단위로 쪼갤 수 없어 사용하지 않음).
 * 파생 칼럼(예약률·비율·성공률 등)은 프론트에서 아래 원시 값으로 계산한다.
 * 정의: docs/db/지표정의.md §6 / §1.3~1.10
 */
@Getter
@Builder
@Jacksonized
public class OverallExamWeeklyItem {
    private final int year;
    private final int month;
    private final int week;        // 그 달 안에서의 주차 (1부터)
    private final boolean partial; // 월 경계로 잘린 부분 주 여부
    private final String startDate; // 주 시작일(월 경계 클립), YYYY-MM-DD
    private final String endDate;   // 주 종료일(월 경계 클립), YYYY-MM-DD

    private final int totalExam;       // idx0  총검사자 = EXAM 행 + Cataract_Exam 세션 (§1.9.1)
    private final int introGeneral;    // idx1  소개유형 일반 (잔차)
    private final int introCustomer;   // idx2  소개유형 고객소개 (MOTIVE_NEW02 = 소개고객 + 소개미확인)
    private final int introStaff;      // idx3  소개유형 직원소개 (MOTIVE_NEW02 = 소개직원)
    private final int jobOffice;       // idx4  직업 직장인 (§1.10)
    private final int jobStudent;      // idx5  직업 학생
    private final int jobEtc;          // idx6  직업 기타
    private final int visionBooked;    // idx7  시력교정 수술예약 (수술예약 O 존재)
    private final int cataractTotal;   // idx9  백내장 전체(노안포함) = Cataract_Exam 세션수
    private final int cataractOnly;    // idx10 백내장 만 = 추천 눈 수 (§1.4)
    private final int cataractBooked;  // idx12 백내장 예약 = 백내장 검사자 중 수술예약 O 존재
    private final int stopCount;       // idx15 중단수 = EXAM.STOP_YN='Y'
    private final int visionExam;      // idx17 검사건수 시력교정 (§1.3)
    private final int dreamlens;       // idx18 검사건수 드림렌즈 (§1.5)
    private final int oneDay;          // idx28 원데이 (검사OP M/5, §1.9.2)
    private final int oneDayBooked;    // idx29 원데이예약 = 원데이 후 7일 이내 유효 시력교정 수술
}
