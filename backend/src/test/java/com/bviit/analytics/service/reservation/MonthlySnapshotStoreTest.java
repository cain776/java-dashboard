package com.bviit.analytics.service.reservation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MonthlySnapshotStoreTest {

    @TempDir
    Path dir;

    @Test
    void 스냅샷을_저장_조회_목록화한다() {
        MonthlySnapshotStore<TestSnapshot, TestDaily> store = newStore();
        TestSnapshot snapshot = snapshot("2026-05", true, List.of(new TestDaily("2026-05-01", 10)));

        store.save(snapshot);

        assertThat(Files.exists(dir.resolve("2026-05.json"))).isTrue();
        assertThat(Files.exists(dir.resolve("2026-05.json.tmp"))).isFalse();
        assertThat(store.find("2026-05")).contains(snapshot);
        assertThat(store.isLocked("2026-05")).isTrue();
        assertThat(store.listSnapshots())
                .containsExactly(new MonthlySnapshotStore.SnapshotInfo("2026-05", true));
    }

    @Test
    void 목록은_월별_json만_정렬해서_반환한다() throws IOException {
        MonthlySnapshotStore<TestSnapshot, TestDaily> store = newStore();
        Files.createDirectories(dir);
        Files.writeString(dir.resolve("memo.txt"), "ignored");
        Files.writeString(dir.resolve("2026-5.json"), "{}");
        store.save(snapshot("2026-07", false, List.of()));
        store.save(snapshot("2026-06", true, List.of()));

        assertThat(store.listSnapshots())
                .containsExactly(
                        new MonthlySnapshotStore.SnapshotInfo("2026-06", true),
                        new MonthlySnapshotStore.SnapshotInfo("2026-07", false)
                );
    }

    @Test
    void 머지는_기존_날짜를_보존하고_빈_날짜만_추가한다() {
        MonthlySnapshotStore<TestSnapshot, TestDaily> store = newStore();
        TestSnapshot existing = snapshot("2026-05", true, List.of(
                new TestDaily("2026-05-02", 20),
                new TestDaily("2026-05-01", 10)
        ));

        List<TestDaily> merged = store.mergeDays(Optional.of(existing), List.of(
                new TestDaily("2026-05-02", 200),
                new TestDaily("2026-05-03", 30)
        ));

        assertThat(merged)
                .containsExactly(
                        new TestDaily("2026-05-01", 10),
                        new TestDaily("2026-05-02", 20),
                        new TestDaily("2026-05-03", 30)
                );
    }

    @Test
    void period는_YYYY_MM만_허용한다() {
        MonthlySnapshotStore<TestSnapshot, TestDaily> store = newStore();

        assertThatThrownBy(() -> store.find("2026-5"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("YYYY-MM");
    }

    private MonthlySnapshotStore<TestSnapshot, TestDaily> newStore() {
        return new MonthlySnapshotStore<>(
                new ObjectMapper(),
                dir.toString(),
                TestSnapshot.class,
                TestSnapshot::period,
                TestSnapshot::locked,
                TestSnapshot::days,
                TestDaily::date,
                "테스트 스냅샷"
        );
    }

    private static TestSnapshot snapshot(String period, boolean locked, List<TestDaily> days) {
        return new TestSnapshot(period, "2026-06-24T10:00:00", "tester", locked, days);
    }

    public record TestSnapshot(
            String period,
            String confirmedAt,
            String confirmedBy,
            boolean locked,
            List<TestDaily> days
    ) {
    }

    public record TestDaily(String date, int count) {
    }
}
