package com.bviit.analytics.reservation.service;

import com.bviit.analytics.common.stats.MonthlySnapshotStore;
import com.bviit.analytics.reservation.dto.ReservationStatsDailyRow;
import com.bviit.analytics.reservation.dto.ReservationStatsSnapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 예약통계시스템 확정 스냅샷의 파일 저장소 — 월별 JSON 1개(원자적 쓰기).
 * 파일 I/O뿐이라 프로파일 무관(운영 DB 미연결 dev에서도 확정 스냅샷 조회 가능).
 * 저장 경로: stats.snapshot.dir (기본 ./data/reservation-stats).
 */
@Service
public class ReservationStatsSnapshotStore {

    private final MonthlySnapshotStore<ReservationStatsSnapshot, ReservationStatsDailyRow> store;

    public ReservationStatsSnapshotStore(
            ObjectMapper mapper,
            @Value("${stats.snapshot.dir:./data/reservation-stats}") String dir
    ) {
        this.store = new MonthlySnapshotStore<>(
                mapper,
                dir,
                ReservationStatsSnapshot.class,
                ReservationStatsSnapshot::period,
                ReservationStatsSnapshot::locked,
                ReservationStatsSnapshot::days,
                ReservationStatsDailyRow::date,
                ReservationStatsSnapshot::schemaVersion,
                ReservationStatsSnapshot.CURRENT_SCHEMA_VERSION,
                "스냅샷"
        );
    }

    /** 확정 월 1건의 요약(목록용) — 일자 데이터 없이 period·locked만. */
    public record SnapshotInfo(String period, boolean locked) {}

    public Optional<ReservationStatsSnapshot> find(String period) {
        return store.find(period);
    }

    /** 해당 월이 PDF 등 고정 스냅샷이라 재확정 금지인지. 없으면 false. */
    public boolean isLocked(String period) {
        return store.isLocked(period);
    }

    /** 원자적 저장(temp 작성 후 rename) — 동시/중단 시 부분 파일 방지. */
    public void save(ReservationStatsSnapshot snapshot) {
        store.save(snapshot);
    }

    /** 확정된 월 목록(period+locked) — 프론트가 "확정됨"·"PDF 고정" 표시에 사용. */
    public List<SnapshotInfo> listSnapshots() {
        return store.listSnapshots().stream()
                .map(info -> new SnapshotInfo(info.period(), info.locked()))
                .toList();
    }

    public List<ReservationStatsDailyRow> mergeDays(
            Optional<ReservationStatsSnapshot> existing,
            List<ReservationStatsDailyRow> fetched
    ) {
        return store.mergeDays(existing, fetched);
    }
}
