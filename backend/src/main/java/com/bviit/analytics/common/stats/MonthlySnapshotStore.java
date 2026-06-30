package com.bviit.analytics.common.stats;

import com.bviit.analytics.common.exception.SnapshotInvariantViolationException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.ToIntFunction;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * 월별 JSON 스냅샷 파일 저장소의 공통 구현.
 *
 * 예약통계(시력교정/백내장)·수술별 비중 등 여러 도메인이 동일한 "월별 1파일 + 원자적 쓰기 + 일자 머지 +
 * 스키마 버전 가드" 규약을 공유한다. 도메인 스냅샷/일자 DTO를 제네릭으로 받고, 추출 함수만 주입한다.
 */
public final class MonthlySnapshotStore<TSnapshot, TDaily> {

    private static final Pattern PERIOD = Pattern.compile("\\d{4}-\\d{2}");
    private static final String JSON_EXTENSION = ".json";

    private final ObjectMapper mapper;
    private final Path dir;
    private final Class<TSnapshot> snapshotType;
    private final Function<TSnapshot, String> periodExtractor;
    private final Predicate<TSnapshot> lockedExtractor;
    private final Function<TSnapshot, List<TDaily>> daysExtractor;
    private final Function<TDaily, String> dateExtractor;
    private final ToIntFunction<TSnapshot> schemaVersionExtractor;
    private final int currentSchemaVersion;
    private final String snapshotLabel;

    public MonthlySnapshotStore(
            ObjectMapper mapper,
            String dir,
            Class<TSnapshot> snapshotType,
            Function<TSnapshot, String> periodExtractor,
            Predicate<TSnapshot> lockedExtractor,
            Function<TSnapshot, List<TDaily>> daysExtractor,
            Function<TDaily, String> dateExtractor,
            ToIntFunction<TSnapshot> schemaVersionExtractor,
            int currentSchemaVersion,
            String snapshotLabel
    ) {
        this.mapper = Objects.requireNonNull(mapper, "mapper");
        this.dir = Path.of(Objects.requireNonNull(dir, "dir"));
        this.snapshotType = Objects.requireNonNull(snapshotType, "snapshotType");
        this.periodExtractor = Objects.requireNonNull(periodExtractor, "periodExtractor");
        this.lockedExtractor = Objects.requireNonNull(lockedExtractor, "lockedExtractor");
        this.daysExtractor = Objects.requireNonNull(daysExtractor, "daysExtractor");
        this.dateExtractor = Objects.requireNonNull(dateExtractor, "dateExtractor");
        this.schemaVersionExtractor = Objects.requireNonNull(schemaVersionExtractor, "schemaVersionExtractor");
        if (currentSchemaVersion < 1) {
            throw new IllegalArgumentException("currentSchemaVersion must be >= 1: " + currentSchemaVersion);
        }
        this.currentSchemaVersion = currentSchemaVersion;
        this.snapshotLabel = Objects.requireNonNull(snapshotLabel, "snapshotLabel");
    }

    /** 확정 월 1건의 요약(목록용) — 일자 데이터 없이 period·locked만. */
    public record SnapshotInfo(String period, boolean locked) {}

    public Optional<TSnapshot> find(String period) {
        Path f = file(period);
        if (!Files.exists(f)) return Optional.empty();
        TSnapshot snapshot;
        try {
            snapshot = mapper.readValue(f.toFile(), snapshotType);
        } catch (IOException e) {
            throw new UncheckedIOException(snapshotLabel + " 읽기 실패: " + period, e);
        }
        // 미래 버전 거부: 현재 코드보다 새 스키마로 저장된 파일은 안전하게 못 읽으므로 fail-closed.
        // (schemaVersion 누락/0은 DTO 생성자가 현재 버전으로 채우므로 여기선 항상 1 이상.)
        int schemaVersion = schemaVersionExtractor.applyAsInt(snapshot);
        if (schemaVersion > currentSchemaVersion) {
            throw new SnapshotInvariantViolationException(
                    snapshotLabel + " schemaVersion " + schemaVersion
                            + " 이 지원 버전(" + currentSchemaVersion + ")보다 높습니다 — 코드 업데이트 필요: " + period);
        }
        return Optional.of(snapshot);
    }

    /** 해당 월이 PDF 등 고정 스냅샷이라 재확정 금지인지. 없으면 false. */
    public boolean isLocked(String period) {
        return find(period).map(snapshot -> lockedExtractor.test(snapshot)).orElse(false);
    }

    /** 원자적 저장(temp 작성 후 rename) — 동시/중단 시 부분 파일 방지. */
    public void save(TSnapshot snapshot) {
        validateSnapshot(snapshot);
        String period = periodExtractor.apply(snapshot);
        Path target = file(period);
        try {
            Files.createDirectories(dir);
            Path tmp = dir.resolve(period + JSON_EXTENSION + ".tmp");
            mapper.writerWithDefaultPrettyPrinter().writeValue(tmp.toFile(), snapshot);
            try {
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (IOException atomicUnsupported) {
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(snapshotLabel + " 저장 실패: " + period, e);
        }
    }

    /** 확정된 월 목록(period+locked) — 프론트가 "확정됨"·"PDF 고정" 표시에 사용. */
    public List<SnapshotInfo> listSnapshots() {
        if (!Files.exists(dir)) return List.of();
        try (Stream<Path> s = Files.list(dir)) {
            return s.map(p -> p.getFileName().toString())
                    .filter(n -> n.endsWith(JSON_EXTENSION))
                    .map(n -> n.substring(0, n.length() - JSON_EXTENSION.length()))
                    .filter(n -> PERIOD.matcher(n).matches())
                    .sorted()
                    .map(period -> new SnapshotInfo(period, isLocked(period)))
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException(snapshotLabel + " 목록 조회 실패", e);
        }
    }

    /**
     * 기존 스냅샷 날짜는 보존하고, 새 조회분에서는 비어있는 날짜만 채운 뒤 날짜순으로 반환한다.
     */
    public List<TDaily> mergeDays(Optional<TSnapshot> existing, List<TDaily> fetched) {
        Objects.requireNonNull(existing, "existing");
        Objects.requireNonNull(fetched, "fetched");

        Map<String, TDaily> byDate = new LinkedHashMap<>();
        existing.ifPresent(snapshot -> daysExtractor.apply(snapshot)
                .forEach(day -> byDate.put(dateExtractor.apply(day), day)));

        for (TDaily day : fetched) {
            byDate.putIfAbsent(dateExtractor.apply(day), day);
        }

        return byDate.values().stream()
                .sorted(Comparator.comparing(dateExtractor))
                .toList();
    }

    private Path file(String period) {
        validatePeriod(period);
        return dir.resolve(period + JSON_EXTENSION);
    }

    private void validateSnapshot(TSnapshot snapshot) {
        if (snapshot == null) {
            throw new SnapshotInvariantViolationException(snapshotLabel + " snapshot must not be null");
        }

        String period = periodExtractor.apply(snapshot);
        validatePeriod(period);
        YearMonth yearMonth = YearMonth.parse(period);

        int schemaVersion = schemaVersionExtractor.applyAsInt(snapshot);
        if (schemaVersion < 1 || schemaVersion > currentSchemaVersion) {
            throw new SnapshotInvariantViolationException(
                    snapshotLabel + " schemaVersion 이 지원 범위(1.." + currentSchemaVersion
                            + ")를 벗어났습니다: " + schemaVersion + " (" + period + ")");
        }

        List<TDaily> days = daysExtractor.apply(snapshot);
        if (days == null) {
            throw new SnapshotInvariantViolationException(snapshotLabel + " days must not be null: " + period);
        }
        if (days.isEmpty()) {
            throw new SnapshotInvariantViolationException(snapshotLabel + " days must not be empty: " + period);
        }
        if (days.size() > yearMonth.lengthOfMonth()) {
            throw new SnapshotInvariantViolationException(snapshotLabel + " days exceeds month length: " + period);
        }

        HashSet<String> dates = new HashSet<>();
        for (TDaily day : days) {
            if (day == null) {
                throw new SnapshotInvariantViolationException(snapshotLabel + " day must not be null: " + period);
            }
            String dateText = dateExtractor.apply(day);
            if (dateText == null) {
                throw new SnapshotInvariantViolationException(snapshotLabel + " day date must not be null: " + period);
            }
            LocalDate date = parseDate(dateText);
            if (!YearMonth.from(date).equals(yearMonth)) {
                throw new SnapshotInvariantViolationException(
                        snapshotLabel + " day date must belong to period: period=" + period + ", date=" + dateText
                );
            }
            if (!dates.add(dateText)) {
                throw new SnapshotInvariantViolationException(snapshotLabel + " duplicate day date: " + dateText);
            }
        }
    }

    private static void validatePeriod(String period) {
        if (period == null || !PERIOD.matcher(period).matches()) {
            throw new SnapshotInvariantViolationException("period must be YYYY-MM: " + period);
        }
    }

    private LocalDate parseDate(String date) {
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException e) {
            throw new SnapshotInvariantViolationException(snapshotLabel + " day date must be yyyy-MM-dd: " + date, e);
        }
    }
}
