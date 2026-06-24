package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.ReservationStatsDailyRow;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsParityResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsSnapshot;
import com.bviit.analytics.repository.reservation.ReservationStatsSystemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile("mssql")
@RequiredArgsConstructor
public class ReservationStatsDiagnosticDiffService {

    private final ReservationStatsSystemRepository repository;
    private final ReservationStatsSnapshotStore snapshotStore;

    @Transactional(readOnly = true)
    public ReservationStatsDiffResponse diff(String period) {
        return ReservationStatsDiagnosticSupport.diff(
                period,
                () -> snapshotStore.find(period).map(ReservationStatsSnapshot::days),
                repository::findDailyCounts,
                ReservationStatsDailyRow::date,
                ReservationStatsFieldRegistry.SYSTEM_FIELDS
        );
    }

    @Transactional(readOnly = true)
    public ReservationStatsDrillDownResponse drillDown(String period, String date, String field) {
        return ReservationStatsDiagnosticSupport.drillDown(
                period,
                date,
                field,
                () -> snapshotStore.find(period).map(ReservationStatsSnapshot::days),
                ReservationStatsDailyRow::date,
                ReservationStatsFieldRegistry.SYSTEM_FIELDS,
                repository::findDrillDownRows
        );
    }

    @Transactional(readOnly = true)
    public ReservationStatsParityResponse parity(String period, String field) {
        return ReservationStatsDiagnosticSupport.parity(
                period,
                field,
                repository::findDailyCounts,
                ReservationStatsDailyRow::date,
                ReservationStatsFieldRegistry.SYSTEM_FIELDS,
                repository::findDrillDownRows
        );
    }
}
