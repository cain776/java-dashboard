package com.bviit.analytics.reservation.service;

import java.util.function.ToIntFunction;

/**
 * diff/drill-down에서 쓰는 집계 필드 정의.
 * 필드명은 API/CSV/SQL drill-down의 공통 계약이므로 한 곳에서 관리한다.
 */
record ReservationStatsField<T>(
        String name,
        String label,
        ToIntFunction<T> value,
        boolean drillDownMapped
) {
}
