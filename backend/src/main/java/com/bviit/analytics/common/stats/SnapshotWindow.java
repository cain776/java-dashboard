package com.bviit.analytics.common.stats;

import java.time.LocalDate;
import java.util.Optional;

/**
 * 월별 스냅샷 적재 종료일 계산 — 마감된 날(전일 D-1)까지만 적재한다.
 *
 * completedEnd = min(말일, 전일). 마감된 날이 이 달에 없으면(=today가 그 달 1일) empty를 반환한다.
 * 이때 오늘(미마감) 데이터는 적재하지 않고 다음날(그 날이 D-1이 되는 시점) 반영한다.
 * (월초 조회 시 오늘 데이터가 스냅샷에 동결되던 버그 방지 — 예: 7/1 조회 시 7/1이 적재되던 문제.)
 */
public final class SnapshotWindow {

    private SnapshotWindow() {
    }

    public static Optional<LocalDate> completedEnd(String period, LocalDate today) {
        LocalDate first = LocalDate.parse(period + "-01");
        if (first.isAfter(today)) {
            throw new IllegalArgumentException("미래 월은 적재할 수 없습니다: " + period);
        }
        LocalDate monthEnd = first.withDayOfMonth(first.lengthOfMonth());
        LocalDate yesterday = today.minusDays(1);
        LocalDate to = monthEnd.isBefore(yesterday) ? monthEnd : yesterday;
        return to.isBefore(first) ? Optional.empty() : Optional.of(to);
    }
}
