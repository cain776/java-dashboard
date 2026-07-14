package com.bviit.analytics.outpatient.service;

import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import com.bviit.analytics.common.exception.SnapshotLockedException;
import com.bviit.analytics.common.stats.StatsResponseMeta;
import com.bviit.analytics.outpatient.dto.OutpatientReservationStatsDailyRow;
import com.bviit.analytics.outpatient.dto.OutpatientReservationStatsSnapshot;
import com.bviit.analytics.reservation.dto.ReservationStatsResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 외래 예약통계 서비스 파사드 — 스냅샷 우선 조회 + 당월 자동 채움 + 출처 메타.
 * 시력교정(ReservationStatsSystemQueryService)과 동일 규약. 진단(diff/parity)은 미포함(추후).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OutpatientReservationStatsQueryService {

    private static final String FORMULA_VERSION = "outpatient-reservation-stats-v1";

    private final OutpatientReservationStatsSnapshotStore snapshotStore;
    private final Optional<OutpatientReservationStatsService> liveService;

    public ReservationStatsResult<List<OutpatientReservationStatsDailyRow>> getDailyCounts(
            LocalDate from,
            LocalDate to,
            String username
    ) {
        String period = from.toString().substring(0, 7);

        // 당월은 확정 스냅샷 동결 전이라도 라이브(요청 범위 = D-1까지)로 최신값을 그대로 노출한다.
        // (지난달은 아래 확정 스냅샷 우선 — 소급 변동 방지. 스냅샷은 확정/월 마감 동결용.)
        if (isCurrentMonth(period) && liveService.isPresent()) {
            return new ReservationStatsResult<>(
                    liveService.get().getDailyCounts(from.toString(), to.toString()),
                    liveMeta(period)
            );
        }

        autoFillIfNeeded(period, username);

        Optional<OutpatientReservationStatsSnapshot> snapshot = snapshotStore.find(period);
        if (snapshot.isPresent()) {
            List<OutpatientReservationStatsDailyRow> days = OutpatientReservationStatsQuerySupport.filterDays(
                    snapshot.get().days(),
                    OutpatientReservationStatsDailyRow::date,
                    from,
                    to
            );
            return new ReservationStatsResult<>(days, snapshotMeta(period, snapshot.get()));
        }

        // 라이브가 없는(비-mssql) 당월 → 빈 결과(미연결 안내).
        if (isCurrentMonth(period)) {
            return new ReservationStatsResult<>(List.of(), liveMeta(period));
        }

        OutpatientReservationStatsService service =
                requireLiveService(period, "확정 스냅샷·라이브 소스(MSSQL)가 없습니다.");
        return new ReservationStatsResult<>(
                service.getDailyCounts(from.toString(), to.toString()),
                liveMeta(period)
        );
    }

    public ReservationStatsResult<OutpatientReservationStatsSnapshot> saveSnapshot(String period, String username) {
        ensureWritable(period, "재확정(덮어쓰기)");
        OutpatientReservationStatsSnapshot snapshot = requireLiveService(period)
                .saveSnapshot(period, OutpatientReservationStatsQuerySupport.actor(username));
        return new ReservationStatsResult<>(snapshot, snapshotMeta(period, snapshot));
    }

    public ReservationStatsResult<OutpatientReservationStatsSnapshot> fillSnapshot(String period, String username) {
        ensureWritable(period, "호출(채움)");
        OutpatientReservationStatsSnapshot snapshot = requireLiveService(period)
                .fillSnapshot(period, OutpatientReservationStatsQuerySupport.actor(username));
        return new ReservationStatsResult<>(snapshot, snapshotMeta(period, snapshot));
    }

    public List<OutpatientReservationStatsSnapshotStore.SnapshotInfo> listSnapshots() {
        return snapshotStore.listSnapshots();
    }

    private static boolean isCurrentMonth(String period) {
        return period.equals(LocalDate.now().toString().substring(0, 7));
    }

    private void autoFillIfNeeded(String period, String username) {
        if (liveService.isEmpty()) return;

        Optional<OutpatientReservationStatsSnapshot> snapshot = snapshotStore.find(period);
        boolean needsAutoFill = OutpatientReservationStatsQuerySupport.needsAutoFill(
                LocalDate.now(),
                period,
                snapshotStore.isLocked(period),
                snapshot,
                OutpatientReservationStatsSnapshot::confirmedAt
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
            throw new SnapshotLockedException("고정 스냅샷이라 " + action + "할 수 없습니다: " + period);
        }
    }

    private OutpatientReservationStatsService requireLiveService(String period) {
        return requireLiveService(period, "실 데이터 소스(MSSQL)가 연결되지 않았습니다.");
    }

    private OutpatientReservationStatsService requireLiveService(String period, String message) {
        return liveService.orElseThrow(() -> dataSourceUnavailable(period, message));
    }

    private static StatsResponseMeta snapshotMeta(String period, OutpatientReservationStatsSnapshot snapshot) {
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
        return StatsResponseMeta.live(period, FORMULA_VERSION, OutpatientReservationStatsSnapshot.CURRENT_SCHEMA_VERSION);
    }

    private static DataSourceUnavailableException dataSourceUnavailable(String period, String message) {
        return new DataSourceUnavailableException(
                message,
                StatsResponseMeta.unavailable(
                        period,
                        FORMULA_VERSION,
                        OutpatientReservationStatsSnapshot.CURRENT_SCHEMA_VERSION
                )
        );
    }
}
