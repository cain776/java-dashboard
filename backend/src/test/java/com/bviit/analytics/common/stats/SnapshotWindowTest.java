package com.bviit.analytics.common.stats;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SnapshotWindowTest {

    @Test
    void 월초_1일이면_마감된_날이_없어_empty를_반환한다() {
        // 7/1 조회: 전일(6/30)이 7월에 없음 → 오늘(7/1) 적재 금지.
        assertThat(SnapshotWindow.completedEnd("2026-07", LocalDate.parse("2026-07-01"))).isEmpty();
    }

    @Test
    void 당월_중간이면_전일까지_반환한다() {
        assertThat(SnapshotWindow.completedEnd("2026-07", LocalDate.parse("2026-07-15")))
                .contains(LocalDate.parse("2026-07-14"));
    }

    @Test
    void 지난달은_말일까지_반환한다() {
        // 7/1에 6월 조회 → 6월 말일(6/30)까지(전일과 동일).
        assertThat(SnapshotWindow.completedEnd("2026-06", LocalDate.parse("2026-07-01")))
                .contains(LocalDate.parse("2026-06-30"));
    }

    @Test
    void 지난달은_이후_어느날_조회해도_말일까지_반환한다() {
        assertThat(SnapshotWindow.completedEnd("2026-06", LocalDate.parse("2026-08-10")))
                .contains(LocalDate.parse("2026-06-30"));
    }

    @Test
    void 미래월은_예외를_던진다() {
        assertThatThrownBy(() -> SnapshotWindow.completedEnd("2026-08", LocalDate.parse("2026-07-01")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
