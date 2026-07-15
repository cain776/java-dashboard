package com.bviit.analytics.outpatient.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

/**
 * 외래 예약통계 조회 계층 공통 헬퍼 — 시력교정의 ReservationStatsQuerySupport와 동일 규약.
 * (해당 클래스가 reservation 패키지 package-private라 재사용 불가 → 필요한 메서드만 외래용으로 둔다.)
 */
final class OutpatientReservationStatsQuerySupport {

    private OutpatientReservationStatsQuerySupport() {
    }

    static <T> List<T> filterDays(
            List<T> days,
            Function<T, String> dateExtractor,
            LocalDate from,
            LocalDate to
    ) {
        String fromText = from.toString();
        String toText = to.toString();
        return days.stream()
                .filter(day -> {
                    String date = dateExtractor.apply(day);
                    return date.compareTo(fromText) >= 0 && date.compareTo(toText) <= 0;
                })
                .toList();
    }

    /**
     * 조회=호출 통합 기준(자동 채움 여부). 시력교정과 동일.
     *   - 당월: 미잠금이고 오늘 아직 채운 적이 없으면 채움(전일 D-1까지).
     *   - 지난달: 스냅샷이 있고 마지막 적재가 말일 이하면 다음달 첫 조회 시 1회 최종 채움.
     *   - 미래월/잠금/과거 미적재는 대상 아님.
     */
    static <T> boolean needsAutoFill(
            LocalDate today,
            String period,
            boolean locked,
            Optional<T> snapshot,
            Function<T, String> confirmedAtExtractor
    ) {
        if (locked) return false;
        String currentMonth = today.toString().substring(0, 7);
        if (period.compareTo(currentMonth) > 0) return false; // 미래월

        if (period.equals(currentMonth)) {
            if (snapshot.isEmpty()) return true;
            return confirmedDateOf(snapshot.get(), confirmedAtExtractor).compareTo(today.toString()) < 0;
        }

        // 지난달 최종화 — 적재 이력이 있고, 마지막 적재일이 말일 이하일 때만.
        if (snapshot.isEmpty()) return false;
        String monthEnd = YearMonth.parse(period).atEndOfMonth().toString();
        return confirmedDateOf(snapshot.get(), confirmedAtExtractor).compareTo(monthEnd) <= 0;
    }

    private static <T> String confirmedDateOf(T snapshot, Function<T, String> confirmedAtExtractor) {
        String confirmedAt = confirmedAtExtractor.apply(snapshot);
        return confirmedAt != null && confirmedAt.length() >= 10 ? confirmedAt.substring(0, 10) : "";
    }

    static String actor(String username) {
        return username == null || username.isBlank() ? "unknown" : username;
    }
}
