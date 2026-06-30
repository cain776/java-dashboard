package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgerySnapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class SurgerySnapshotStoreTest {

    @TempDir
    Path dir;

    private SurgerySnapshotStore newStore() {
        return new SurgerySnapshotStore(new ObjectMapper(), dir.toString());
    }

    private SurgeryDailyItem day(String date, int vision) {
        return SurgeryDailyItem.builder()
                .date(date)
                .visionPatients(vision)
                .total(vision)
                .build();
    }

    @Test
    void 스냅샷을_저장하고_일자_데이터까지_복원한다() {
        SurgerySnapshotStore store = newStore();
        SurgerySnapshot snapshot = new SurgerySnapshot(
                "2026-06", "2026-06-30T09:00:00", "tester", false,
                List.of(day("2026-06-01", 10), day("2026-06-02", 7)));

        store.save(snapshot);

        Optional<SurgerySnapshot> loaded = store.find("2026-06");
        assertThat(loaded).isPresent();
        assertThat(loaded.get().days()).hasSize(2);
        assertThat(loaded.get().days().get(0).getDate()).isEqualTo("2026-06-01");
        assertThat(loaded.get().days().get(0).getVisionPatients()).isEqualTo(10);
        assertThat(loaded.get().confirmedBy()).isEqualTo("tester");
    }

    @Test
    void mergeDays는_기존_일자를_보존하고_새_일자만_더한다() {
        SurgerySnapshotStore store = newStore();
        SurgerySnapshot existing = new SurgerySnapshot(
                "2026-06", "2026-06-29T09:00:00", "auto", false,
                List.of(day("2026-06-01", 10)));
        store.save(existing);

        // 06-01은 값이 바뀐 채로 다시 조회돼도(흔들림) 보존, 06-02만 추가돼야 한다.
        List<SurgeryDailyItem> fetched = List.of(day("2026-06-01", 999), day("2026-06-02", 5));
        List<SurgeryDailyItem> merged = store.mergeDays(store.find("2026-06"), fetched);

        assertThat(merged).hasSize(2);
        assertThat(merged.get(0).getDate()).isEqualTo("2026-06-01");
        assertThat(merged.get(0).getVisionPatients()).isEqualTo(10); // 보존(흔들리지 않음)
        assertThat(merged.get(1).getDate()).isEqualTo("2026-06-02");
        assertThat(merged.get(1).getVisionPatients()).isEqualTo(5);
    }
}
