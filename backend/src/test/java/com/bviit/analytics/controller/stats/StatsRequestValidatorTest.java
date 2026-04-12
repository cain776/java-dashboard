package com.bviit.analytics.controller.stats;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class StatsRequestValidatorTest {

    @Test
    void validateYearsAcceptsUpToFiveCurrentWindowYears() {
        int currentYear = LocalDate.now().getYear();

        assertDoesNotThrow(() -> StatsRequestValidator.validateYears(List.of(
                currentYear - 3,
                currentYear - 2,
                currentYear - 1,
                currentYear,
                currentYear + 1
        )));
    }

    @Test
    void validateYearsRejectsMissingOutOfRangeAndNullYears() {
        assertEquals(
                "연도는 1~5개까지 지정할 수 있습니다.",
                assertThrows(IllegalArgumentException.class, () -> StatsRequestValidator.validateYears(List.of()))
                        .getMessage()
        );

        int currentYear = LocalDate.now().getYear();
        assertEquals(
                "유효하지 않은 연도: 2019",
                assertThrows(IllegalArgumentException.class, () -> StatsRequestValidator.validateYears(List.of(2019)))
                        .getMessage()
        );
        assertEquals(
                "유효하지 않은 연도: " + (currentYear + 2),
                assertThrows(
                        IllegalArgumentException.class,
                        () -> StatsRequestValidator.validateYears(List.of(currentYear + 2))
                ).getMessage()
        );
        assertEquals(
                "연도는 비어 있을 수 없습니다.",
                assertThrows(
                        IllegalArgumentException.class,
                        () -> StatsRequestValidator.validateYears(Arrays.asList(currentYear, null))
                ).getMessage()
        );
    }

    @Test
    void validateDateRangeRejectsReverseAndOverwideRanges() {
        assertEquals(
                "from은 to보다 이전이어야 합니다.",
                assertThrows(
                        IllegalArgumentException.class,
                        () -> StatsRequestValidator.validateDateRange(LocalDate.of(2026, 4, 2), LocalDate.of(2026, 4, 1), 366)
                ).getMessage()
        );
        assertEquals(
                "조회 기간은 최대 366일입니다.",
                assertThrows(
                        IllegalArgumentException.class,
                        () -> StatsRequestValidator.validateDateRange(LocalDate.of(2024, 1, 1), LocalDate.of(2025, 1, 2), 366)
                ).getMessage()
        );
    }
}
