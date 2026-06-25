package com.bviit.analytics.reservation.service;

import com.bviit.analytics.reservation.dto.CataractStatsCellEdit;
import com.bviit.analytics.reservation.dto.CataractStatsDailyRow;
import com.bviit.analytics.reservation.dto.CataractStatsSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * 예약통계_백내장 — 확정 스냅샷의 특정 일자 셀(인입콜/응대콜)을 손보정한다.
 *
 * 왜 필요한가: 인입콜/응대콜은 EICN 상담원 그룹(group_code='0016')이 응대한 콜을 세는데, 백내장 전담
 * 2명 중 1명이 휴가면 그 몫이 시력교정팀으로 넘어가 라이브가 과소집계된다(예: 2026-06-24 17/17 vs
 * 레거시 30/29). 이런 날은 PDF/레거시 값을 손으로 채워야 하므로, 화면에서 셀을 직접 고치는 경로를 둔다.
 *
 * 수정 가능 필드는 인입콜/응대콜로 한정(파생값·다른 채널 제외). 파일 I/O뿐이라 프로파일 무관이며,
 * 라이브 자동 채움(fill)과의 경합을 막기 위해 월 단위 락 안에서 read-modify-write 한다.
 */
@Service
@RequiredArgsConstructor
public class CataractStatsCellEditService {

    /** 손보정 허용 필드 — 휴가로 라이브가 어긋나는 인입/응대콜만. */
    static final Set<String> EDITABLE_FIELDS = Set.of("inboundCall", "answeredCall");
    private static final int MAX_VALUE = 100_000;

    private final CataractStatsSnapshotStore snapshotStore;
    private final ReservationStatsPeriodLock periodLock;

    /**
     * 해당 월 스냅샷의 date 일자 field 값을 value로 바꾸고 수정 이력을 남긴다.
     * locked(PDF 고정) 월도 손보정은 허용한다 — 휴가일 보정이 바로 그 용도이며, 이력으로 추적된다.
     *
     * @return 갱신된 일자 row(수정 이력 포함)
     */
    public CataractStatsDailyRow editCell(String period, String date, String field, int value, String editedBy) {
        if (!EDITABLE_FIELDS.contains(field)) {
            throw new IllegalArgumentException("수정할 수 없는 필드입니다: " + field);
        }
        if (value < 0 || value > MAX_VALUE) {
            throw new IllegalArgumentException("값은 0 이상 " + MAX_VALUE + " 이하여야 합니다: " + value);
        }
        if (date == null || !date.startsWith(period + "-")) {
            throw new IllegalArgumentException("일자가 해당 월에 속하지 않습니다: date=" + date + ", period=" + period);
        }
        String by = editedBy == null || editedBy.isBlank() ? "unknown" : editedBy;
        String at = LocalDateTime.now().toString();

        return periodLock.withPeriodLock(period, () -> {
            CataractStatsSnapshot snapshot = snapshotStore.find(period)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "스냅샷이 없어 수정할 수 없습니다. 먼저 조회/확정하세요: " + period));

            List<CataractStatsDailyRow> days = new ArrayList<>(snapshot.days());
            int idx = indexOfDate(days, date);
            if (idx < 0) {
                throw new IllegalArgumentException("해당 일자가 스냅샷에 없습니다: " + date);
            }

            CataractStatsDailyRow updated = applyEdit(days.get(idx), field, value,
                    new CataractStatsCellEdit(field, value, by, at));
            days.set(idx, updated);

            snapshotStore.save(new CataractStatsSnapshot(
                    snapshot.period(), snapshot.confirmedAt(), snapshot.confirmedBy(),
                    snapshot.locked(), days, snapshot.schemaVersion()));
            return updated;
        });
    }

    private static int indexOfDate(List<CataractStatsDailyRow> days, String date) {
        for (int i = 0; i < days.size(); i++) {
            if (date.equals(days.get(i).date())) return i;
        }
        return -1;
    }

    /** date row의 field 값을 바꾸고, 같은 필드 기존 이력은 교체(필드당 최신 1건 유지). */
    private static CataractStatsDailyRow applyEdit(
            CataractStatsDailyRow d, String field, int value, CataractStatsCellEdit edit) {
        int inbound = "inboundCall".equals(field) ? value : d.inboundCall();
        int answered = "answeredCall".equals(field) ? value : d.answeredCall();

        List<CataractStatsCellEdit> edits = new ArrayList<>();
        for (CataractStatsCellEdit e : d.manualEdits()) {
            if (!e.field().equals(field)) edits.add(e);
        }
        edits.add(edit);

        return new CataractStatsDailyRow(
                d.date(), d.totalCataract(), d.totalPresbyopia(),
                inbound, answered,
                d.newExamInquiry(), d.newReInquiry(), d.newPatient(),
                d.tmTotalDb(), d.tmValidDb(), d.tmReservation(),
                d.kakaoTotalInquiry(), d.kakaoCataractReservation(), d.kakaoPresbyopiaReservation(),
                d.onlineReservation(), d.onlineNoShow(),
                d.cancelOnline(), d.cancelCrm(), d.cancelKakao(),
                d.visit(), d.noShowReservation(), d.cancel(),
                edits);
    }
}
