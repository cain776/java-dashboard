package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.CataractStatsSnapshot;
import com.bviit.analytics.reservation.dto.ReservationStatsSnapshot;
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
        store.save(snapshot("2026-07", false, List.of(new TestDaily("2026-07-01", 1))));
        store.save(snapshot("2026-06", true, List.of(new TestDaily("2026-06-01", 1))));

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

    @Test
    void 저장은_빈_days를_거부한다() {
        MonthlySnapshotStore<TestSnapshot, TestDaily> store = newStore();

        assertThatThrownBy(() -> store.save(snapshot("2026-05", false, List.of())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("days must not be empty");
    }

    @Test
    void 저장은_period_밖의_날짜를_거부한다() {
        MonthlySnapshotStore<TestSnapshot, TestDaily> store = newStore();

        assertThatThrownBy(() -> store.save(snapshot(
                "2026-05",
                false,
                List.of(new TestDaily("2026-06-01", 10))
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must belong to period");
    }

    @Test
    void 저장은_중복_날짜를_거부한다() {
        MonthlySnapshotStore<TestSnapshot, TestDaily> store = newStore();

        assertThatThrownBy(() -> store.save(snapshot(
                "2026-05",
                false,
                List.of(
                        new TestDaily("2026-05-01", 10),
                        new TestDaily("2026-05-01", 20)
                )
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("duplicate day date");
    }

    @Test
    void 저장은_날짜_형식을_검증한다() {
        MonthlySnapshotStore<TestSnapshot, TestDaily> store = newStore();

        assertThatThrownBy(() -> store.save(snapshot(
                "2026-05",
                false,
                List.of(new TestDaily("2026-5-1", 10))
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("yyyy-MM-dd");
    }

    @Test
    void schemaVersion이_없는_기존_JSON은_현재_버전으로_읽는다() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        String json = """
                {
                  "period": "2026-05",
                  "confirmedAt": "2026-06-24T10:00:00",
                  "confirmedBy": "tester",
                  "locked": true,
                  "days": [{ "date": "2026-05-01" }]
                }
                """;

        ReservationStatsSnapshot system = mapper.readValue(json, ReservationStatsSnapshot.class);
        CataractStatsSnapshot cataract = mapper.readValue(json, CataractStatsSnapshot.class);

        assertThat(system.schemaVersion()).isEqualTo(ReservationStatsSnapshot.CURRENT_SCHEMA_VERSION);
        assertThat(cataract.schemaVersion()).isEqualTo(CataractStatsSnapshot.CURRENT_SCHEMA_VERSION);
    }

    @Test
    void 저장은_지원_범위를_벗어난_schemaVersion을_거부한다() {
        MonthlySnapshotStore<TestSnapshot, TestDaily> store = newStore();
        List<TestDaily> days = List.of(new TestDaily("2026-05-01", 10));

        assertThatThrownBy(() -> store.save(snapshot("2026-05", false, days, TEST_CURRENT_SCHEMA_VERSION + 1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("schemaVersion");
        assertThatThrownBy(() -> store.save(snapshot("2026-05", false, days, 0)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("schemaVersion");
    }

    @Test
    void 읽기는_지원_버전보다_높은_schemaVersion_파일을_거부한다() throws IOException {
        MonthlySnapshotStore<TestSnapshot, TestDaily> store = newStore();
        Files.createDirectories(dir);
        Files.writeString(dir.resolve("2026-05.json"), """
                {
                  "period": "2026-05",
                  "confirmedAt": "2026-06-24T10:00:00",
                  "confirmedBy": "tester",
                  "locked": true,
                  "days": [{ "date": "2026-05-01", "count": 1 }],
                  "schemaVersion": %d
                }
                """.formatted(TEST_CURRENT_SCHEMA_VERSION + 1));

        assertThatThrownBy(() -> store.find("2026-05"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("코드 업데이트 필요");
    }

    private static final int TEST_CURRENT_SCHEMA_VERSION = 1;

    private MonthlySnapshotStore<TestSnapshot, TestDaily> newStore() {
        return new MonthlySnapshotStore<>(
                new ObjectMapper(),
                dir.toString(),
                TestSnapshot.class,
                TestSnapshot::period,
                TestSnapshot::locked,
                TestSnapshot::days,
                TestDaily::date,
                TestSnapshot::schemaVersion,
                TEST_CURRENT_SCHEMA_VERSION,
                "테스트 스냅샷"
        );
    }

    private static TestSnapshot snapshot(String period, boolean locked, List<TestDaily> days) {
        return snapshot(period, locked, days, TEST_CURRENT_SCHEMA_VERSION);
    }

    private static TestSnapshot snapshot(String period, boolean locked, List<TestDaily> days, int schemaVersion) {
        return new TestSnapshot(period, "2026-06-24T10:00:00", "tester", locked, days, schemaVersion);
    }

    public record TestSnapshot(
            String period,
            String confirmedAt,
            String confirmedBy,
            boolean locked,
            List<TestDaily> days,
            int schemaVersion
    ) {
    }

    public record TestDaily(String date, int count) {
    }
}
