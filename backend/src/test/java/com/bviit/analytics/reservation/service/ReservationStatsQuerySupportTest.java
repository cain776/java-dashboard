package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.ReservationStatsSnapshot;
import com.bviit.analytics.testsupport.ReservationDailyRowBuilder;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** needsAutoFill 날짜 규칙 — 특히 말일이 다음달 1일 조회 때 최종 채워지는지. */
class ReservationStatsQuerySupportTest {

    private static Optional<ReservationStatsSnapshot> snap(String period, String confirmedAt, boolean locked) {
        return Optional.of(new ReservationStatsSnapshot(
                period, confirmedAt, "tester", locked,
                List.of(ReservationDailyRowBuilder.row(period + "-01").build())));
    }

    private static boolean needs(LocalDate today, String period, Optional<ReservationStatsSnapshot> snapshot) {
        boolean locked = snapshot.map(ReservationStatsSnapshot::locked).orElse(false);
        return ReservationStatsQuerySupport.needsAutoFill(
                today, period, locked, snapshot, ReservationStatsSnapshot::confirmedAt);
    }

    @Test
    void 당월_미적재면_채운다() {
        assertThat(needs(LocalDate.parse("2026-06-15"), "2026-06", Optional.empty())).isTrue();
    }

    @Test
    void 당월_오늘_이미_적재했으면_안_채운다() {
        assertThat(needs(LocalDate.parse("2026-06-15"), "2026-06",
                snap("2026-06", "2026-06-15T09:00:00", false))).isFalse();
    }

    @Test
    void 당월_어제_적재면_오늘_다시_채운다() {
        assertThat(needs(LocalDate.parse("2026-06-15"), "2026-06",
                snap("2026-06", "2026-06-14T09:00:00", false))).isTrue();
    }

    @Test
    void 지난달_말일당일_적재는_다음달_1일에_최종_채움한다() {
        // 6/30에 적재해도 그날은 D-1(6/29)까지만 잡혀 6/30이 빔 → 7/1 조회 시 최종 채움 필요.
        assertThat(needs(LocalDate.parse("2026-07-01"), "2026-06",
                snap("2026-06", "2026-06-30T09:00:00", false))).isTrue();
    }

    @Test
    void 지난달_다음달_1일_이후_적재면_최종화_완료라_안_채운다() {
        assertThat(needs(LocalDate.parse("2026-07-05"), "2026-06",
                snap("2026-06", "2026-07-01T09:00:00", false))).isFalse();
    }

    @Test
    void 지난달_미적재는_대상이_아니다() {
        assertThat(needs(LocalDate.parse("2026-07-01"), "2026-06", Optional.empty())).isFalse();
    }

    @Test
    void 잠금월은_안_채운다() {
        assertThat(needs(LocalDate.parse("2026-07-01"), "2026-06",
                snap("2026-06", "2026-06-30T09:00:00", true))).isFalse();
    }

    @Test
    void 미래월은_안_채운다() {
        assertThat(needs(LocalDate.parse("2026-06-15"), "2026-07", Optional.empty())).isFalse();
    }
}
