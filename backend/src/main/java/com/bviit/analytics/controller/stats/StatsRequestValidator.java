package com.bviit.analytics.controller.stats;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

public final class StatsRequestValidator {

    private static final int MIN_YEAR = 2020;
    private static final int MAX_YEAR_COUNT = 5;

    private StatsRequestValidator() {
    }

    public static void validateYears(List<Integer> years) {
        if (years == null || years.isEmpty() || years.size() > MAX_YEAR_COUNT) {
            throw new IllegalArgumentException("연도는 1~5개까지 지정할 수 있습니다.");
        }

        int currentYear = LocalDate.now().getYear();
        for (Integer year : years) {
            if (year == null) {
                throw new IllegalArgumentException("연도는 비어 있을 수 없습니다.");
            }
            if (year < MIN_YEAR || year > currentYear + 1) {
                throw new IllegalArgumentException("유효하지 않은 연도: " + year);
            }
        }
    }

    public static void validateDateRange(LocalDate from, LocalDate to, int maxRangeDays) {
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("from은 to보다 이전이어야 합니다.");
        }
        if (ChronoUnit.DAYS.between(from, to) > maxRangeDays) {
            throw new IllegalArgumentException("조회 기간은 최대 " + maxRangeDays + "일입니다.");
        }
    }
}
