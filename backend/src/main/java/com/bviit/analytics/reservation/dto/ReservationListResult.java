package com.bviit.analytics.reservation.dto;

import java.util.List;
import java.util.Map;

/**
 * 예약자 리스트 응답 — 명단 행 + 카카오(해피톡, 명단 외) 건수.
 *
 *   - rows: RESERVATION 기반 검사예약 행(예약 종합의 콜+online과 동일 정의·동일 junk 제외).
 *   - kakaoCount: RESERVATION엔 없고 해피톡에만 있는 카카오 예약 수 — **참고용**(예약 종합엔 미포함).
 * 명단 행 합계 = 예약 종합 월 값(둘 다 카카오 미포함). kakaoCount는 화면에 참고로만 표시한다.
 */
public record ReservationListResult(List<Map<String, Object>> rows, int kakaoCount) {
}
