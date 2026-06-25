package com.bviit.analytics.service.reservation;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

final class ReservationStatsQuerySupport {

    private ReservationStatsQuerySupport() {
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
     * 조회=호출 통합 기준: 당월·미잠금이고 오늘 아직 채운 적이 없을 때만 자동 채움.
     */
    static <T> boolean needsAutoFill(
            String period,
            boolean locked,
            Optional<T> snapshot,
            Function<T, String> confirmedAtExtractor
    ) {
        LocalDate today = LocalDate.now();
        if (!period.equals(today.toString().substring(0, 7))) return false;
        if (locked) return false;
        if (snapshot.isEmpty()) return true;

        String confirmedAt = confirmedAtExtractor.apply(snapshot.get());
        String confirmedDate = confirmedAt != null && confirmedAt.length() >= 10
                ? confirmedAt.substring(0, 10)
                : "";
        return confirmedDate.compareTo(today.toString()) < 0;
    }

    static <T> String latestDate(List<T> days, Function<T, String> dateExtractor) {
        return days.stream()
                .map(dateExtractor)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }

    static String actor(String username) {
        return username == null || username.isBlank() ? "unknown" : username;
    }
}
