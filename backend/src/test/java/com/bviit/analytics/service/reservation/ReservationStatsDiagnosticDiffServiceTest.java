package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;
import com.bviit.analytics.dto.reservation.CataractStatsSnapshot;
import com.bviit.analytics.dto.reservation.ReservationStatsDailyRow;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffItem;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsSnapshot;
import com.bviit.analytics.repository.reservation.CataractStatsSystemRepository;
import com.bviit.analytics.repository.reservation.ReservationStatsSystemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationStatsDiagnosticDiffServiceTest {

    @Mock
    private ReservationStatsSystemRepository reservationRepository;

    @Mock
    private ReservationStatsSnapshotStore reservationSnapshotStore;

    @Mock
    private CataractStatsSystemRepository cataractRepository;

    @Mock
    private CataractStatsSnapshotStore cataractSnapshotStore;

    @Test
    void 스냅샷이_없으면_라이브를_조회하지_않고_빈_diff를_반환한다() {
        YearMonth period = previousPeriod();
        ReservationStatsDiagnosticDiffService service = new ReservationStatsDiagnosticDiffService(
                reservationRepository,
                reservationSnapshotStore
        );
        when(reservationSnapshotStore.find(period.toString())).thenReturn(Optional.empty());

        ReservationStatsDiffResponse response = service.diff(period.toString());

        assertThat(response.period()).isEqualTo(period.toString());
        assertThat(response.snapshotExists()).isFalse();
        assertThat(response.liveFrom()).isEqualTo(period.atDay(1).toString());
        assertThat(response.liveTo()).isEqualTo(period.atEndOfMonth().toString());
        assertThat(response.diffCount()).isZero();
        assertThat(response.diffs()).isEmpty();
        verifyNoInteractions(reservationRepository);
    }

    @Test
    void 값이_다른_numeric_field를_diff로_반환한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(1).toString();
        ReservationStatsDiagnosticDiffService service = new ReservationStatsDiagnosticDiffService(
                reservationRepository,
                reservationSnapshotStore
        );
        when(reservationSnapshotStore.find(period.toString()))
                .thenReturn(Optional.of(reservationSnapshot(period, List.of(reservationRow(date, 10, 0, 0)))));
        when(reservationRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(reservationRow(date, 12, 0, 0)));

        ReservationStatsDiffResponse response = service.diff(period.toString());

        assertThat(response.snapshotExists()).isTrue();
        assertThat(response.diffCount()).isEqualTo(1);
        assertThat(response.diffs()).containsExactly(
                new ReservationStatsDiffItem(date, "inboundCall", 10, 12, 2)
        );
    }

    @Test
    void 라이브에만_있는_날짜는_snapshot_값_null로_비교한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(2).toString();
        ReservationStatsDiagnosticDiffService service = new ReservationStatsDiagnosticDiffService(
                reservationRepository,
                reservationSnapshotStore
        );
        when(reservationSnapshotStore.find(period.toString()))
                .thenReturn(Optional.of(reservationSnapshot(period, List.of())));
        when(reservationRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(reservationRow(date, 0, 0, 3)));

        ReservationStatsDiffResponse response = service.diff(period.toString());

        assertThat(response.diffs()).containsExactly(
                new ReservationStatsDiffItem(date, "callReservation", null, 3, null)
        );
    }

    @Test
    void 스냅샷에만_있는_날짜는_live_값_null로_비교한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(3).toString();
        ReservationStatsDiagnosticDiffService service = new ReservationStatsDiagnosticDiffService(
                reservationRepository,
                reservationSnapshotStore
        );
        when(reservationSnapshotStore.find(period.toString()))
                .thenReturn(Optional.of(reservationSnapshot(period, List.of(reservationRow(date, 0, 7, 0)))));
        when(reservationRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of());

        ReservationStatsDiffResponse response = service.diff(period.toString());

        assertThat(response.diffs()).containsExactly(
                new ReservationStatsDiffItem(date, "newInquiry", 7, null, null)
        );
    }

    @Test
    void 날짜가_서로_누락되면_양쪽_날짜를_각각_diff로_반환한다() {
        YearMonth period = previousPeriod();
        String snapshotDate = period.atDay(4).toString();
        String liveDate = period.atDay(5).toString();
        ReservationStatsDiagnosticDiffService service = new ReservationStatsDiagnosticDiffService(
                reservationRepository,
                reservationSnapshotStore
        );
        when(reservationSnapshotStore.find(period.toString()))
                .thenReturn(Optional.of(reservationSnapshot(period, List.of(reservationRow(snapshotDate, 5, 0, 0)))));
        when(reservationRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(reservationRow(liveDate, 6, 0, 0)));

        ReservationStatsDiffResponse response = service.diff(period.toString());

        assertThat(response.diffs()).containsExactly(
                new ReservationStatsDiffItem(snapshotDate, "inboundCall", 5, null, null),
                new ReservationStatsDiffItem(liveDate, "inboundCall", null, 6, null)
        );
    }

    @Test
    void 백내장도_daily_row_numeric_field를_비교한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(1).toString();
        CataractStatsDiagnosticDiffService service = new CataractStatsDiagnosticDiffService(
                cataractRepository,
                cataractSnapshotStore
        );
        when(cataractSnapshotStore.find(period.toString()))
                .thenReturn(Optional.of(cataractSnapshot(period, List.of(cataractRow(date, 10, 0)))));
        when(cataractRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(cataractRow(date, 12, 0)));

        ReservationStatsDiffResponse response = service.diff(period.toString());

        assertThat(response.diffs()).containsExactly(
                new ReservationStatsDiffItem(date, "totalCataract", 10, 12, 2)
        );
        verify(cataractRepository).findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString());
    }

    private static YearMonth previousPeriod() {
        return YearMonth.now().minusMonths(1);
    }

    private static ReservationStatsSnapshot reservationSnapshot(
            YearMonth period,
            List<ReservationStatsDailyRow> days
    ) {
        return new ReservationStatsSnapshot(period.toString(), "2026-06-24T10:00:00", "tester", false, days);
    }

    private static CataractStatsSnapshot cataractSnapshot(
            YearMonth period,
            List<CataractStatsDailyRow> days
    ) {
        return new CataractStatsSnapshot(period.toString(), "2026-06-24T10:00:00", "tester", false, days);
    }

    private static ReservationStatsDailyRow reservationRow(
            String date,
            int inboundCall,
            int newInquiry,
            int callReservation
    ) {
        return new ReservationStatsDailyRow(
                date,
                inboundCall, 0, newInquiry, callReservation,
                0, 0, 0,
                0, 0, 0,
                0, 0,
                0, 0, 0, 0,
                0, 0,
                0, 0, 0,
                0, 0, 0
        );
    }

    private static CataractStatsDailyRow cataractRow(String date, int totalCataract, int cancel) {
        return new CataractStatsDailyRow(
                date,
                totalCataract, 0,
                0, 0,
                0, 0, 0,
                0, 0, 0,
                0, 0, 0,
                0, 0,
                0, 0, 0,
                0, 0, cancel
        );
    }
}
