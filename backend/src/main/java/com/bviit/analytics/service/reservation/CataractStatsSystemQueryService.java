package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;
import com.bviit.analytics.dto.reservation.CataractStatsSnapshot;
import com.bviit.analytics.dto.reservation.ReservationStatsDiagnosticsHealthResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsDrillDownResponse;
import com.bviit.analytics.dto.reservation.ReservationStatsParityResponse;
import com.bviit.analytics.dto.stats.StatsResponseMeta;
import com.bviit.analytics.dto.reservation.ReservationStatsResult;
import com.bviit.analytics.exception.DataSourceUnavailableException;
import com.bviit.analytics.exception.SnapshotLockedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CataractStatsSystemQueryService {

    private static final String STATS_TYPE = "cataract";
    private static final String FORMULA_VERSION = "reservation-stats-cataract-v1";

    private final CataractStatsSnapshotStore snapshotStore;
    private final CataractStatsCellEditService cellEditService;
    private final Optional<CataractStatsSystemService> liveService;
    private final Optional<CataractStatsDiagnosticDiffService> diagnosticService;

    public ReservationStatsResult<List<CataractStatsDailyRow>> getDailyCounts(
            LocalDate from,
            LocalDate to,
            String username
    ) {
        String period = from.toString().substring(0, 7);
        autoFillIfNeeded(period, username);

        Optional<CataractStatsSnapshot> snapshot = snapshotStore.find(period);
        if (snapshot.isPresent()) {
            List<CataractStatsDailyRow> days = ReservationStatsQuerySupport.filterDays(
                    snapshot.get().days(),
                    CataractStatsDailyRow::date,
                    from,
                    to
            );
            return new ReservationStatsResult<>(days, snapshotMeta(period, snapshot.get()));
        }

        CataractStatsSystemService service = requireLiveService(period, "확정 스냅샷·라이브 소스(MSSQL)가 없습니다.");
        return new ReservationStatsResult<>(
                service.getDailyCounts(from.toString(), to.toString()),
                liveMeta(period)
        );
    }

    public ReservationStatsResult<CataractStatsSnapshot> saveSnapshot(String period, String username) {
        ensureWritable(period, "재확정(덮어쓰기)");
        CataractStatsSnapshot snapshot = requireLiveService(period)
                .saveSnapshot(period, ReservationStatsQuerySupport.actor(username));
        return new ReservationStatsResult<>(snapshot, snapshotMeta(period, snapshot));
    }

    public ReservationStatsResult<CataractStatsSnapshot> fillSnapshot(String period, String username) {
        ensureWritable(period, "호출(채움)");
        CataractStatsSnapshot snapshot = requireLiveService(period)
                .fillSnapshot(period, ReservationStatsQuerySupport.actor(username));
        return new ReservationStatsResult<>(snapshot, snapshotMeta(period, snapshot));
    }

    public CataractStatsDailyRow editCell(
            String period,
            String date,
            String field,
            int value,
            String username
    ) {
        return cellEditService.editCell(period, date, field, value, ReservationStatsQuerySupport.actor(username));
    }

    public List<CataractStatsSnapshotStore.SnapshotInfo> listSnapshots() {
        return snapshotStore.listSnapshots();
    }

    public ReservationStatsDiffResponse diff(String period) {
        return requireDiagnosticService(period).diff(period);
    }

    public ReservationStatsDrillDownResponse drillDown(String period, String date, String field) {
        return requireDiagnosticService(period).drillDown(period, date, field);
    }

    public ReservationStatsParityResponse parity(String period, String field) {
        return requireDiagnosticService(period).parity(period, field);
    }

    public ReservationStatsDiagnosticsHealthResponse health(String period) {
        Optional<CataractStatsSnapshot> snapshot = snapshotStore.find(period);
        StatsResponseMeta.Source source = snapshot.isPresent()
                ? StatsResponseMeta.Source.SNAPSHOT
                : liveService.isPresent()
                ? StatsResponseMeta.Source.LIVE
                : StatsResponseMeta.Source.UNAVAILABLE;

        return new ReservationStatsDiagnosticsHealthResponse(
                period,
                STATS_TYPE,
                source,
                liveService.isPresent(),
                diagnosticService.isPresent(),
                snapshot.isPresent(),
                snapshot.map(CataractStatsSnapshot::locked).orElse(false),
                snapshot.map(CataractStatsSnapshot::schemaVersion)
                        .orElse(CataractStatsSnapshot.CURRENT_SCHEMA_VERSION),
                snapshot.map(s -> s.days().size()).orElse(0),
                snapshot.map(s -> ReservationStatsQuerySupport.latestDate(s.days(), CataractStatsDailyRow::date))
                        .orElse(null),
                snapshot.map(CataractStatsSnapshot::confirmedAt).orElse(null),
                snapshot.map(CataractStatsSnapshot::confirmedBy).orElse(null),
                FORMULA_VERSION,
                LocalDateTime.now().toString()
        );
    }

    private void autoFillIfNeeded(String period, String username) {
        if (liveService.isEmpty()) return;

        Optional<CataractStatsSnapshot> snapshot = snapshotStore.find(period);
        boolean needsAutoFill = ReservationStatsQuerySupport.needsAutoFill(
                period,
                snapshotStore.isLocked(period),
                snapshot,
                CataractStatsSnapshot::confirmedAt
        );
        if (!needsAutoFill) return;

        try {
            liveService.get().fillSnapshot(period, username == null ? "auto" : username);
        } catch (RuntimeException e) {
            log.warn("조회 중 자동 채움 실패(기존 데이터로 계속): period={}, err={}", period, e.getMessage());
        }
    }

    private void ensureWritable(String period, String action) {
        if (snapshotStore.isLocked(period)) {
            throw new SnapshotLockedException("PDF 고정 스냅샷이라 " + action + "할 수 없습니다: " + period);
        }
    }

    private CataractStatsSystemService requireLiveService(String period) {
        return requireLiveService(period, "실 데이터 소스(MSSQL)가 연결되지 않았습니다.");
    }

    private CataractStatsSystemService requireLiveService(String period, String message) {
        return liveService.orElseThrow(() -> dataSourceUnavailable(period, message));
    }

    private CataractStatsDiagnosticDiffService requireDiagnosticService(String period) {
        return diagnosticService.orElseThrow(() -> dataSourceUnavailable(
                period,
                "실 데이터 소스(MSSQL)가 연결되지 않았습니다."
        ));
    }

    private static StatsResponseMeta snapshotMeta(String period, CataractStatsSnapshot snapshot) {
        return StatsResponseMeta.snapshot(
                period,
                FORMULA_VERSION,
                snapshot.locked(),
                snapshot.confirmedAt(),
                snapshot.confirmedBy(),
                snapshot.schemaVersion()
        );
    }

    private static StatsResponseMeta liveMeta(String period) {
        return StatsResponseMeta.live(
                period,
                FORMULA_VERSION,
                CataractStatsSnapshot.CURRENT_SCHEMA_VERSION
        );
    }

    private static DataSourceUnavailableException dataSourceUnavailable(String period, String message) {
        return new DataSourceUnavailableException(
                message,
                StatsResponseMeta.unavailable(
                        period,
                        FORMULA_VERSION,
                        CataractStatsSnapshot.CURRENT_SCHEMA_VERSION
                )
        );
    }
}
