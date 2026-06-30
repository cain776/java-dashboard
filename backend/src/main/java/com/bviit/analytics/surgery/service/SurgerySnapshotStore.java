package com.bviit.analytics.surgery.service;

import com.bviit.analytics.common.stats.MonthlySnapshotStore;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgerySnapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.Supplier;

/**
 * 수술별 비중 일별 스냅샷의 파일 저장소 — 월별 JSON 1개(원자적 쓰기).
 * 파일 I/O뿐이라 프로파일 무관(운영 DB 미연결 dev에서도 적재된 스냅샷 조회 가능).
 * 저장 경로: stats.surgery-composition-snapshot.dir (기본 ./data/surgery-composition).
 */
@Service
public class SurgerySnapshotStore {

    private final MonthlySnapshotStore<SurgerySnapshot, SurgeryDailyItem> store;
    /** 월별 read-merge-save 구간 보호용 단일 JVM 락(자동 채움 동시성 방지). */
    private final ConcurrentMap<String, Object> periodLocks = new ConcurrentHashMap<>();

    public SurgerySnapshotStore(
            ObjectMapper mapper,
            @Value("${stats.surgery-composition-snapshot.dir:./data/surgery-composition}") String dir
    ) {
        this.store = new MonthlySnapshotStore<>(
                mapper,
                dir,
                SurgerySnapshot.class,
                SurgerySnapshot::period,
                SurgerySnapshot::locked,
                SurgerySnapshot::days,
                SurgeryDailyItem::getDate,
                SurgerySnapshot::schemaVersion,
                SurgerySnapshot.CURRENT_SCHEMA_VERSION,
                "수술별 비중 스냅샷"
        );
    }

    public Optional<SurgerySnapshot> find(String period) {
        return store.find(period);
    }

    public boolean isLocked(String period) {
        return store.isLocked(period);
    }

    public void save(SurgerySnapshot snapshot) {
        store.save(snapshot);
    }

    public List<MonthlySnapshotStore.SnapshotInfo> listSnapshots() {
        return store.listSnapshots();
    }

    /** 기존 날짜는 보존하고 새 조회분의 비어있는 날짜만 채워 날짜순 반환. */
    public List<SurgeryDailyItem> mergeDays(Optional<SurgerySnapshot> existing, List<SurgeryDailyItem> fetched) {
        return store.mergeDays(existing, fetched);
    }

    /** 월별 read-merge-save 임계 구간 보호(단일 JVM). */
    public <T> T withPeriodLock(String period, Supplier<T> action) {
        Objects.requireNonNull(period, "period");
        synchronized (periodLocks.computeIfAbsent(period, k -> new Object())) {
            return action.get();
        }
    }
}
