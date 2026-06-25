package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;
import com.bviit.analytics.dto.reservation.CataractStatsSnapshot;
import com.bviit.analytics.dto.reservation.ReservationStatsDailyRow;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffItem;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownRow;
import com.bviit.analytics.dto.reservation.ReservationStatsParityItem;
import com.bviit.analytics.dto.reservation.ReservationStatsParityResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsSnapshot;
import com.bviit.analytics.repository.reservation.CataractStatsSystemRepository;
import com.bviit.analytics.repository.reservation.ReservationStatsSystemRepository;
import com.bviit.analytics.testsupport.CataractDailyRowBuilder;
import com.bviit.analytics.testsupport.ReservationDailyRowBuilder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.never;
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
                new ReservationStatsDiffItem(date, "inboundCall", "인입콜", 10, 12, 2)
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
                new ReservationStatsDiffItem(date, "callReservation", "예약수", null, 3, null)
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
                new ReservationStatsDiffItem(date, "newInquiry", "신규예약 문의", 7, null, null)
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
                new ReservationStatsDiffItem(snapshotDate, "inboundCall", "인입콜", 5, null, null),
                new ReservationStatsDiffItem(liveDate, "inboundCall", "인입콜", null, 6, null)
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
                new ReservationStatsDiffItem(date, "totalCataract", "백내장", 10, 12, 2)
        );
        verify(cataractRepository).findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString());
    }

    @Test
    void 시력교정_drill_down은_스냅샷값과_라이브_row_기여도_합계를_함께_반환한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(1).toString();
        ReservationStatsDiagnosticDiffService service = new ReservationStatsDiagnosticDiffService(
                reservationRepository,
                reservationSnapshotStore
        );
        when(reservationSnapshotStore.find(period.toString()))
                .thenReturn(Optional.of(reservationSnapshot(period, List.of(reservationRow(date, 10, 0, 0)))));
        when(reservationRepository.findDrillDownRows(date, "inboundCall"))
                .thenReturn(List.of(
                        drillRow(date, "inboundCall", "CH_01", "인입콜", "EICN:1", 7),
                        drillRow(date, "inboundCall", "CH_01", "인입콜", "EICN:2", 5)
                ));

        ReservationStatsDrillDownResponse response = service.drillDown(period.toString(), date, "inboundCall");

        assertThat(response.snapshotExists()).isTrue();
        assertThat(response.label()).isEqualTo("인입콜");
        assertThat(response.snapshotValue()).isEqualTo(10);
        assertThat(response.liveValue()).isEqualTo(12);
        assertThat(response.delta()).isEqualTo(2);
        assertThat(response.rowCount()).isEqualTo(2);
        assertThat(response.rows()).hasSize(2);
        verify(reservationRepository).findDrillDownRows(date, "inboundCall");
    }

    @Test
    void 시력교정_drill_down은_스냅샷이_없어도_라이브_row를_반환한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(2).toString();
        ReservationStatsDiagnosticDiffService service = new ReservationStatsDiagnosticDiffService(
                reservationRepository,
                reservationSnapshotStore
        );
        when(reservationSnapshotStore.find(period.toString())).thenReturn(Optional.empty());
        when(reservationRepository.findDrillDownRows(date, "callReservation"))
                .thenReturn(List.of(drillRow(date, "callReservation", "CH_03", "검사_예약", "CALL:1", 1)));

        ReservationStatsDrillDownResponse response = service.drillDown(period.toString(), date, "callReservation");

        assertThat(response.snapshotExists()).isFalse();
        assertThat(response.label()).isEqualTo("예약수");
        assertThat(response.snapshotValue()).isNull();
        assertThat(response.liveValue()).isEqualTo(1);
        assertThat(response.delta()).isNull();
    }

    @Test
    void drill_down은_알수없는_field를_거부한다() {
        YearMonth period = previousPeriod();
        ReservationStatsDiagnosticDiffService service = new ReservationStatsDiagnosticDiffService(
                reservationRepository,
                reservationSnapshotStore
        );

        assertThatThrownBy(() -> service.drillDown(period.toString(), period.atDay(1).toString(), "unknownField"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown reservation stats field");

        verifyNoInteractions(reservationSnapshotStore, reservationRepository);
    }

    @Test
    void drill_down은_period_밖의_날짜를_거부한다() {
        YearMonth period = previousPeriod();
        ReservationStatsDiagnosticDiffService service = new ReservationStatsDiagnosticDiffService(
                reservationRepository,
                reservationSnapshotStore
        );

        assertThatThrownBy(() -> service.drillDown(period.toString(), period.plusMonths(1).atDay(1).toString(), "inboundCall"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("date must belong to period");

        verifyNoInteractions(reservationSnapshotStore, reservationRepository);
    }

    @Test
    void 백내장_drill_down은_0_고정_field도_유효_field로_처리한다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(1).toString();
        CataractStatsDiagnosticDiffService service = new CataractStatsDiagnosticDiffService(
                cataractRepository,
                cataractSnapshotStore
        );
        when(cataractSnapshotStore.find(period.toString()))
                .thenReturn(Optional.of(cataractSnapshot(period, List.of(cataractRow(date, 0, 0)))));

        ReservationStatsDrillDownResponse response = service.drillDown(period.toString(), date, "totalPresbyopia");

        assertThat(response.snapshotValue()).isZero();
        assertThat(response.liveValue()).isZero();
        assertThat(response.delta()).isZero();
        assertThat(response.rows()).isEmpty();
    }

    @Test
    void parity는_daily_집계값과_drill_down_기여도_합계를_일자별로_대조한다() {
        YearMonth period = previousPeriod();
        String date1 = period.atDay(1).toString();
        String date2 = period.atDay(2).toString();
        ReservationStatsDiagnosticDiffService service = new ReservationStatsDiagnosticDiffService(
                reservationRepository,
                reservationSnapshotStore
        );
        when(reservationRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(
                        reservationRow(date1, 3, 0, 0),
                        reservationRow(date2, 5, 0, 0)
                ));
        when(reservationRepository.findDrillDownRows(anyString(), eq("inboundCall"))).thenReturn(List.of());
        when(reservationRepository.findDrillDownRows(date1, "inboundCall"))
                .thenReturn(List.of(
                        drillRow(date1, "inboundCall", "CH_01", "인입콜", "EICN:1", 1),
                        drillRow(date1, "inboundCall", "CH_01", "인입콜", "EICN:2", 2)
                ));
        when(reservationRepository.findDrillDownRows(date2, "inboundCall"))
                .thenReturn(List.of(drillRow(date2, "inboundCall", "CH_01", "인입콜", "EICN:3", 4)));

        ReservationStatsParityResponse response = service.parity(period.toString(), "inboundCall");

        assertThat(response.field()).isEqualTo("inboundCall");
        assertThat(response.label()).isEqualTo("인입콜");
        assertThat(response.mismatchCount()).isEqualTo(1);
        assertThat(response.items())
                .filteredOn(item -> item.date().equals(date1))
                .containsExactly(new ReservationStatsParityItem(date1, "inboundCall", "인입콜", 3, 3, 0, 2));
        assertThat(response.items())
                .filteredOn(item -> item.date().equals(date2))
                .containsExactly(new ReservationStatsParityItem(date2, "inboundCall", "인입콜", 5, 4, -1, 1));
    }

    @Test
    void parity는_drill_down_매핑이_없는_0고정_field에서_상세_sql을_호출하지_않는다() {
        YearMonth period = previousPeriod();
        String date = period.atDay(1).toString();
        CataractStatsDiagnosticDiffService service = new CataractStatsDiagnosticDiffService(
                cataractRepository,
                cataractSnapshotStore
        );
        when(cataractRepository.findDailyCounts(period.atDay(1).toString(), period.atEndOfMonth().toString()))
                .thenReturn(List.of(cataractRow(date, 0, 0)));

        ReservationStatsParityResponse response = service.parity(period.toString(), "totalPresbyopia");

        assertThat(response.field()).isEqualTo("totalPresbyopia");
        assertThat(response.label()).isEqualTo("노안");
        assertThat(response.mismatchCount()).isZero();
        verify(cataractRepository, never()).findDrillDownRows(anyString(), eq("totalPresbyopia"));
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
        return ReservationDailyRowBuilder.row(date)
                .inboundCall(inboundCall).newInquiry(newInquiry).callReservation(callReservation).build();
    }

    private static CataractStatsDailyRow cataractRow(String date, int totalCataract, int cancel) {
        return CataractDailyRowBuilder.row(date).totalCataract(totalCataract).cancel(cancel).build();
    }

    private static ReservationStatsDrillDownRow drillRow(
            String date,
            String field,
            String source,
            String gb,
            String primaryKey,
            int contribution
    ) {
        return new ReservationStatsDrillDownRow(date, field, source, gb, "", primaryKey, contribution);
    }
}
