package com.bviit.analytics.common.util;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MonthlyBucketsTest {

    @Test
    void initializeCreatesOrderedYearMonthBuckets() {
        Map<String, String> buckets = MonthlyBuckets.initialize(
                List.of(2025, 2026),
                (year, month) -> year + "-" + month
        );

        assertThat(buckets).hasSize(24);
        assertThat(buckets.keySet()).startsWith("2025-1", "2025-2", "2025-3");
        assertThat(buckets.keySet()).endsWith("2026-10", "2026-11", "2026-12");
        assertThat(buckets.get(MonthlyBuckets.key(2026, 12))).isEqualTo("2026-12");
    }
}
