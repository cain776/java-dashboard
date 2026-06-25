package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.CataractStatsSnapshot;
import com.bviit.analytics.testsupport.CataractDailyRowBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CataractStatsCellEditServiceTest {

    @TempDir
    Path dir;

    private CataractStatsSnapshotStore store;
    private CataractStatsCellEditService service;

    @BeforeEach
    void setUp() {
        store = new CataractStatsSnapshotStore(new ObjectMapper(), dir.toString());
        service = new CataractStatsCellEditService(store, new ReservationStatsPeriodLock());
    }

    private static CataractStatsDailyRow day(String date, int inbound, int answered) {
        return CataractDailyRowBuilder.row(date).inboundCall(inbound).answeredCall(answered).build();
    }

    private void seed(String period, boolean locked, CataractStatsDailyRow... days) {
        store.save(new CataractStatsSnapshot(period, "2026-06-25T00:00:00", "seed", locked, List.of(days)));
    }

    @Test
    void 인입콜을_수정하고_이력을_남기며_저장한다() {
        seed("2026-06", false, day("2026-06-24", 17, 17));

        CataractStatsDailyRow updated = service.editCell("2026-06", "2026-06-24", "inboundCall", 30, "kim");

        assertThat(updated.inboundCall()).isEqualTo(30);
        assertThat(updated.answeredCall()).isEqualTo(17);
        assertThat(updated.manualEdits()).hasSize(1);
        assertThat(updated.manualEdits().get(0).field()).isEqualTo("inboundCall");
        assertThat(updated.manualEdits().get(0).value()).isEqualTo(30);
        assertThat(updated.manualEdits().get(0).editedBy()).isEqualTo("kim");

        CataractStatsDailyRow persisted = store.find("2026-06").orElseThrow().days().get(0);
        assertThat(persisted.inboundCall()).isEqualTo(30);
        assertThat(persisted.manualEdits()).hasSize(1);
    }

    @Test
    void 같은_필드_재수정시_이력은_최신_1건만_유지한다() {
        seed("2026-06", false, day("2026-06-24", 17, 17));
        service.editCell("2026-06", "2026-06-24", "inboundCall", 30, "kim");

        CataractStatsDailyRow updated = service.editCell("2026-06", "2026-06-24", "inboundCall", 31, "lee");

        assertThat(updated.inboundCall()).isEqualTo(31);
        assertThat(updated.manualEdits()).hasSize(1);
        assertThat(updated.manualEdits().get(0).value()).isEqualTo(31);
        assertThat(updated.manualEdits().get(0).editedBy()).isEqualTo("lee");
    }

    @Test
    void 인입콜_응대콜_각각_수정하면_이력_2건이_남는다() {
        seed("2026-06", false, day("2026-06-24", 17, 17));
        service.editCell("2026-06", "2026-06-24", "inboundCall", 30, "kim");

        CataractStatsDailyRow updated = service.editCell("2026-06", "2026-06-24", "answeredCall", 29, "kim");

        assertThat(updated.inboundCall()).isEqualTo(30);
        assertThat(updated.answeredCall()).isEqualTo(29);
        assertThat(updated.manualEdits()).hasSize(2);
    }

    @Test
    void locked_월도_손보정은_허용한다() {
        seed("2026-05", true, day("2026-05-01", 10, 10));

        CataractStatsDailyRow updated = service.editCell("2026-05", "2026-05-01", "inboundCall", 12, "kim");

        assertThat(updated.inboundCall()).isEqualTo(12);
        assertThat(store.find("2026-05").orElseThrow().locked()).isTrue();
    }

    @Test
    void 수정_불가_필드는_거부한다() {
        seed("2026-06", false, day("2026-06-24", 17, 17));
        assertThatThrownBy(() -> service.editCell("2026-06", "2026-06-24", "visit", 5, "kim"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 음수값은_거부한다() {
        seed("2026-06", false, day("2026-06-24", 17, 17));
        assertThatThrownBy(() -> service.editCell("2026-06", "2026-06-24", "inboundCall", -1, "kim"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 스냅샷에_없는_일자는_거부한다() {
        seed("2026-06", false, day("2026-06-24", 17, 17));
        assertThatThrownBy(() -> service.editCell("2026-06", "2026-06-23", "inboundCall", 5, "kim"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 다른_월_일자는_거부한다() {
        seed("2026-06", false, day("2026-06-24", 17, 17));
        assertThatThrownBy(() -> service.editCell("2026-06", "2026-07-01", "inboundCall", 5, "kim"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 스냅샷이_없으면_거부한다() {
        assertThatThrownBy(() -> service.editCell("2026-06", "2026-06-24", "inboundCall", 5, "kim"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
