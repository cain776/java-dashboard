package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.CataractStatsSnapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 예약통계_백내장 확정 스냅샷의 파일 저장소 — 월별 JSON 1개(원자적 쓰기).
 * 시력교정(ReservationStatsSnapshotStore)과 동일 구조. 파일 I/O뿐이라 프로파일 무관.
 * 저장 경로: stats.cataract-snapshot.dir (기본 ./data/reservation-stats-cataract).
 */
@Service
public class CataractStatsSnapshotStore {

    private final MonthlySnapshotStore<CataractStatsSnapshot, CataractStatsDailyRow> store;

    public CataractStatsSnapshotStore(
            ObjectMapper mapper,
            @Value("${stats.cataract-snapshot.dir:./data/reservation-stats-cataract}") String dir
    ) {
        this.store = new MonthlySnapshotStore<>(
                mapper,
                dir,
                CataractStatsSnapshot.class,
                CataractStatsSnapshot::period,
                CataractStatsSnapshot::locked,
                CataractStatsSnapshot::days,
                CataractStatsDailyRow::date,
                CataractStatsSnapshot::schemaVersion,
                CataractStatsSnapshot.CURRENT_SCHEMA_VERSION,
                "백내장 스냅샷"
        );
    }

    /** 확정 월 1건의 요약(목록용) — 일자 데이터 없이 period·locked만. */
    public record SnapshotInfo(String period, boolean locked) {}

    public Optional<CataractStatsSnapshot> find(String period) {
        return store.find(period);
    }

    /** 해당 월이 PDF 등 고정 스냅샷이라 재확정 금지인지. 없으면 false. */
    public boolean isLocked(String period) {
        return store.isLocked(period);
    }

    /** 원자적 저장(temp 작성 후 rename) — 동시/중단 시 부분 파일 방지. */
    public void save(CataractStatsSnapshot snapshot) {
        store.save(snapshot);
    }

    /** 확정된 월 목록(period+locked) — 프론트가 "확정됨"·"PDF 고정" 표시에 사용. */
    public List<SnapshotInfo> listSnapshots() {
        return store.listSnapshots().stream()
                .map(info -> new SnapshotInfo(info.period(), info.locked()))
                .toList();
    }

    public List<CataractStatsDailyRow> mergeDays(
            Optional<CataractStatsSnapshot> existing,
            List<CataractStatsDailyRow> fetched
    ) {
        return store.mergeDays(existing, fetched);
    }
}
