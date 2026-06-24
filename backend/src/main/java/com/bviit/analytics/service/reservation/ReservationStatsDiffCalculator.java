package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.ReservationStatsDiffItem;
import com.bviit.analytics.dto.reservation.ReservationStatsDiffResponse;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.function.ToIntFunction;

final class ReservationStatsDiffCalculator {

    private ReservationStatsDiffCalculator() {
    }

    record Field<T>(String name, ToIntFunction<T> value) {
    }

    record LiveRange(LocalDate from, LocalDate to) {
    }

    static LiveRange liveRange(YearMonth period) {
        LocalDate first = period.atDay(1);
        LocalDate monthEnd = period.atEndOfMonth();
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDate to = period.equals(YearMonth.now()) && yesterday.isBefore(monthEnd) ? yesterday : monthEnd;
        if (to.isBefore(first)) {
            to = first;
        }
        return new LiveRange(first, to);
    }

    static ReservationStatsDiffResponse missingSnapshot(String period, LiveRange range) {
        return new ReservationStatsDiffResponse(
                period,
                false,
                range.from().toString(),
                range.to().toString(),
                0,
                List.of()
        );
    }

    static <T> Field<T> requireField(List<Field<T>> fields, String name) {
        return fields.stream()
                .filter(field -> field.name().equals(name))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown reservation stats field: " + name));
    }

    static Integer delta(Integer snapshotValue, Integer liveValue) {
        return snapshotValue == null || liveValue == null ? null : liveValue - snapshotValue;
    }

    static LocalDate requireDateInPeriod(YearMonth period, String date) {
        LocalDate parsed = LocalDate.parse(date);
        if (!YearMonth.from(parsed).equals(period)) {
            throw new IllegalArgumentException("date must belong to period: " + period);
        }
        return parsed;
    }

    static <T> ReservationStatsDiffResponse compare(
            String period,
            LiveRange range,
            List<T> snapshotRows,
            List<T> liveRows,
            Function<T, String> dateExtractor,
            List<Field<T>> fields
    ) {
        Map<String, T> snapshotByDate = byDateWithin(snapshotRows, dateExtractor, range);
        Map<String, T> liveByDate = byDateWithin(liveRows, dateExtractor, range);

        TreeSet<String> dates = new TreeSet<>();
        dates.addAll(snapshotByDate.keySet());
        dates.addAll(liveByDate.keySet());

        List<ReservationStatsDiffItem> diffs = new ArrayList<>();
        for (String date : dates) {
            T snapshotRow = snapshotByDate.get(date);
            T liveRow = liveByDate.get(date);
            for (Field<T> field : fields) {
                if (snapshotRow == null) {
                    int liveValue = field.value().applyAsInt(liveRow);
                    if (liveValue != 0) {
                        diffs.add(new ReservationStatsDiffItem(date, field.name(), null, liveValue, null));
                    }
                    continue;
                }
                if (liveRow == null) {
                    int snapshotValue = field.value().applyAsInt(snapshotRow);
                    if (snapshotValue != 0) {
                        diffs.add(new ReservationStatsDiffItem(date, field.name(), snapshotValue, null, null));
                    }
                    continue;
                }

                Integer snapshotValue = snapshotRow == null ? null : field.value().applyAsInt(snapshotRow);
                Integer liveValue = liveRow == null ? null : field.value().applyAsInt(liveRow);
                if (!Objects.equals(snapshotValue, liveValue)) {
                    diffs.add(new ReservationStatsDiffItem(
                            date,
                            field.name(),
                            snapshotValue,
                            liveValue,
                            snapshotValue == null || liveValue == null ? null : liveValue - snapshotValue
                    ));
                }
            }
        }

        return new ReservationStatsDiffResponse(
                period,
                true,
                range.from().toString(),
                range.to().toString(),
                diffs.size(),
                diffs
        );
    }

    private static <T> Map<String, T> byDateWithin(
            List<T> rows,
            Function<T, String> dateExtractor,
            LiveRange range
    ) {
        Map<String, T> byDate = new HashMap<>();
        for (T row : rows) {
            String date = dateExtractor.apply(row);
            if (date.compareTo(range.from().toString()) >= 0 && date.compareTo(range.to().toString()) <= 0) {
                byDate.put(date, row);
            }
        }
        return byDate;
    }
}
