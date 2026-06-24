package com.bviit.analytics.controller.stats;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.List;

public final class StatsRequestValidator {

    private static final int MIN_YEAR = 2020;
    private static final int MAX_YEAR_COUNT = 5;

    private StatsRequestValidator() {
    }

    /**
     * 기준 월(period) 검증 — YYYY-MM 형식이며 실제 존재하는 월이어야 한다(13월 등 거부).
     * 검증 통과 시 입력을 그대로 반환한다.
     */
    public static String validatePeriod(String period) {
        if (period == null || period.isBlank()) {
            throw new IllegalArgumentException("기준 월(period)이 필요합니다.");
        }
        try {
            YearMonth.parse(period);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("기준 월 형식이 올바르지 않습니다(YYYY-MM): " + period);
        }
        return period;
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
