package com.bviit.analytics.dto.reservation;

/**
 * 예약통계 서비스 파사드가 컨트롤러에 전달하는 표준 응답 페이로드.
 *
 * 컨트롤러는 data/meta를 ApiResponse에 담기만 하고, 데이터 출처 판단은 서비스 계층에서 끝낸다.
 */
public record ReservationStatsResult<T>(
        T data,
        Object meta
) {
}
