package com.bviit.analytics.dto.reservation;

import lombok.Builder;
import lombok.Getter;
import lombok.extern.jackson.Jacksonized;

/**
 * 예약 종합(콜, 온라인) — 월별 단일 행.
 *
 * 레거시 BCRM '문의통계(RSS)' 화면의 검사예약 채널 합계(콜 + 홈페이지/앱 + 네이버 + 카카오톡).
 * 원본 산식: {@code uSTATISTICSD1Sql.cs}(BCRM 디컴파일). 콜=CTI 인입·TM·재상담 예약,
 * 온라인=홈페이지/앱·네이버·카카오톡 예약을 중복 제거해 합산한 검사예약 종합 건수.
 *
 * 다중 소스(콜센터 MySQL 링크드서버·네이버·해피톡 등, 등록일 기준)를 교차 집계하므로 운영 MSSQL
 * 단독으로는 실시간 재현 불가. 표시 기준:
 *   - 2024~2025: 레거시 종합/온라인 확정값 고정
 *   - 2026~: 운영 DB 추정치. 공식값과 월 차이 있음(특히 2월), 당월까지만 신뢰.
 *
 * 필드:
 *   - reservations(=total): 예약 종합(콜+온라인) 추정치.
 *   - online: 온라인 예약(홈페이지 ONLINE/APP + 네이버 NAVER). 카카오는 RESERVE_PATH 부재로 사실상 미포함.
 *   - call: 콜 예약(인콜 CTI + 아웃콜 CRM).
 */
@Getter
@Builder
@Jacksonized
public class ReservationOverallMonthlyItem {
    private final int year;
    private final int month;
    private final Integer reservations;
    private final Integer online;
    private final Integer call;
    private final Integer total;
}
