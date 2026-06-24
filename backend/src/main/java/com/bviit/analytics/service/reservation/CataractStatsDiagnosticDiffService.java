package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;
import com.bviit.analytics.dto.reservation.CataractStatsSnapshot;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownResponse;
import com.bviit.analytics.repository.reservation.CataractStatsSystemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile("mssql")
@RequiredArgsConstructor
public class CataractStatsDiagnosticDiffService {

    private final CataractStatsSystemRepository repository;
    private final CataractStatsSnapshotStore snapshotStore;

    @Transactional(readOnly = true)
    public ReservationStatsDiffResponse diff(String period) {
        return ReservationStatsDiagnosticSupport.diff(
                period,
                () -> snapshotStore.find(period).map(CataractStatsSnapshot::days),
                repository::findDailyCounts,
                CataractStatsDailyRow::date,
                ReservationStatsFieldRegistry.CATARACT_FIELDS
        );
    }

    @Transactional(readOnly = true)
    public ReservationStatsDrillDownResponse drillDown(String period, String date, String field) {
        return ReservationStatsDiagnosticSupport.drillDown(
                period,
                date,
                field,
                () -> snapshotStore.find(period).map(CataractStatsSnapshot::days),
                CataractStatsDailyRow::date,
                ReservationStatsFieldRegistry.CATARACT_FIELDS,
                repository::findDrillDownRows
        );
    }
}
