package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.ReservationStatsSnapshot;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * 예약통계시스템 확정 스냅샷의 파일 저장소 — 월별 JSON 1개(원자적 쓰기).
 * 파일 I/O뿐이라 프로파일 무관(운영 DB 미연결 dev에서도 확정 스냅샷 조회 가능).
 * 저장 경로: stats.snapshot.dir (기본 ./data/reservation-stats).
 */
@Service
public class ReservationStatsSnapshotStore {

    private static final Pattern PERIOD = Pattern.compile("\\d{4}-\\d{2}");

    private final ObjectMapper mapper;
    private final Path dir;

    public ReservationStatsSnapshotStore(
            ObjectMapper mapper,
            @Value("${stats.snapshot.dir:./data/reservation-stats}") String dir
    ) {
        this.mapper = mapper;
        this.dir = Path.of(dir);
    }

    /** 확정 월 1건의 요약(목록용) — 일자 데이터 없이 period·locked만. */
    public record SnapshotInfo(String period, boolean locked) {}

    public Optional<ReservationStatsSnapshot> find(String period) {
        Path f = file(period);
        if (!Files.exists(f)) return Optional.empty();
        try {
            return Optional.of(mapper.readValue(f.toFile(), ReservationStatsSnapshot.class));
        } catch (IOException e) {
            throw new UncheckedIOException("스냅샷 읽기 실패: " + period, e);
        }
    }

    /** 해당 월이 PDF 등 고정 스냅샷이라 재확정 금지인지. 없으면 false. */
    public boolean isLocked(String period) {
        return find(period).map(ReservationStatsSnapshot::locked).orElse(false);
    }

    /** 원자적 저장(temp 작성 후 rename) — 동시/중단 시 부분 파일 방지. */
    public void save(ReservationStatsSnapshot snapshot) {
        Path target = file(snapshot.period());
        try {
            Files.createDirectories(dir);
            Path tmp = dir.resolve(snapshot.period() + ".json.tmp");
            mapper.writerWithDefaultPrettyPrinter().writeValue(tmp.toFile(), snapshot);
            try {
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (IOException atomicUnsupported) {
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("스냅샷 저장 실패: " + snapshot.period(), e);
        }
    }

    /** 확정된 월 목록(period+locked) — 프론트가 "확정됨"·"PDF 고정" 표시에 사용. */
    public List<SnapshotInfo> listSnapshots() {
        if (!Files.exists(dir)) return List.of();
        try (Stream<Path> s = Files.list(dir)) {
            return s.map(p -> p.getFileName().toString())
                    .filter(n -> n.endsWith(".json"))
                    .map(n -> n.substring(0, n.length() - ".json".length()))
                    .filter(n -> PERIOD.matcher(n).matches())
                    .sorted()
                    .map(period -> new SnapshotInfo(period, isLocked(period)))
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException("스냅샷 목록 조회 실패", e);
        }
    }

    private Path file(String period) {
        if (period == null || !PERIOD.matcher(period).matches()) {
            throw new IllegalArgumentException("period must be YYYY-MM: " + period);
        }
        return dir.resolve(period + ".json");
    }
}
