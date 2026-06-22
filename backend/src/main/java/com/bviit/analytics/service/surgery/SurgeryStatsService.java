package com.bviit.analytics.service.surgery;

import com.bviit.analytics.dto.surgery.SurgeryMonthlyItem;
import com.bviit.analytics.repository.surgery.SurgeryStatsRepository;
import com.bviit.analytics.util.MonthlyBuckets;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.bviit.analytics.util.NumberUtils.toInt;

@Service
@Profile("mssql")
@RequiredArgsConstructor
public class SurgeryStatsService {

    private static final Map<Integer, Map<Integer, Integer>> LEGACY_VISION_SURGERY = Map.of(
            2024, Map.of(1, 1617, 2, 1578, 3, 799, 4, 688),
            2025, Map.of(1, 1878, 2, 1533, 3, 796, 4, 712),
            2026, Map.of(1, 1361, 2, 1388, 3, 657, 4, 568)
    );

    private final SurgeryStatsRepository repository;
    private final ObjectMapper objectMapper;

    @Value("${stats.cache.surgery.enabled:true}")
    private boolean cacheEnabled;

    @Value("${stats.cache.dir:.cache/stats}")
    private String cacheDir;

    /**
     * 연도별 월간 수술 유형별 환자 수 (레거시 기준).
     * 시력교정(OPERATIONDATA, 백내장 제외) + 백내장(Cataract_Operationdata) 두 쿼리 병합.
     */
    @Transactional(readOnly = true)
    public List<SurgeryMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();

        Optional<List<SurgeryMonthlyItem>> cached = readCache(normalizedYears);
        if (cached.isPresent()) {
            return cached.get();
        }

        List<Map<String, Object>> visionRows = repository.findVisionMonthlyByType(normalizedYears);
        List<Map<String, Object>> cataractRows = repository.findCataractMonthlyByType(normalizedYears);
        List<Map<String, Object>> reopRows = repository.findReoperationMonthly(normalizedYears);

        LinkedHashMap<String, Bucket> map = MonthlyBuckets.initialize(normalizedYears, Bucket::new);

        // 시력교정 병합
        for (Map<String, Object> row : visionRows) {
            String key = MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo")));
            Bucket b = map.get(key);
            if (b == null) continue;

            b.lasek = toInt(row.get("lasek"));
            b.lasik = toInt(row.get("lasik"));
            b.smile = toInt(row.get("smile"));
            b.smilePro = toInt(row.get("smilePro"));
            b.icl = toInt(row.get("icl"));
            b.tIcl = toInt(row.get("tIcl"));
            b.kpl = toInt(row.get("kpl"));
            b.tKpl = toInt(row.get("tKpl"));
            b.viva = toInt(row.get("viva"));
            b.xtra = toInt(row.get("xtra"));
            b.waveVision = toInt(row.get("waveVision"));
            b.monoVision = toInt(row.get("monoVision"));
            b.visionPatients = toInt(row.get("visionPatients"));
        }

        // 재수술 병합 (RE_OPERATION, 안 단위)
        for (Map<String, Object> row : reopRows) {
            String key = MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo")));
            Bucket b = map.get(key);
            if (b == null) continue;
            b.reoperation = toInt(row.get("reoperation"));
        }

        // 백내장 병합
        for (Map<String, Object> row : cataractRows) {
            String key = MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo")));
            Bucket b = map.get(key);
            if (b == null) continue;

            b.catMulti = toInt(row.get("catMulti"));
            b.catMono = toInt(row.get("catMono"));
            b.catEdof = toInt(row.get("catEdof"));
            b.cataractPatients = toInt(row.get("cataractPatients"));
        }

        for (Bucket b : map.values()) {
            legacyVisionSurgery(b.year, b.month).ifPresent(value -> b.visionPatients = value);
        }

        // DTO 변환
        List<SurgeryMonthlyItem> result = new ArrayList<>();
        for (Bucket b : map.values()) {
            result.add(SurgeryMonthlyItem.builder()
                    .year(b.year).month(b.month)
                    .lasek(b.lasek).lasik(b.lasik).smile(b.smile).smilePro(b.smilePro)
                    .icl(b.icl).tIcl(b.tIcl).kpl(b.kpl).tKpl(b.tKpl).viva(b.viva)
                    .catMulti(b.catMulti).catMono(b.catMono).catEdof(b.catEdof)
                    .xtra(b.xtra).waveVision(b.waveVision).monoVision(b.monoVision)
                    .reoperation(b.reoperation)
                    .visionPatients(b.visionPatients)
                    .cataractPatients(b.cataractPatients)
                    // 총 수술수 = 시력교정 + 백내장 + 재수술(레코드) — 레거시 월간보고 p.26 정의
                    .total(b.visionPatients + b.cataractPatients + b.reoperation)
                    .build());
        }

        writeCache(normalizedYears, result);
        return result;
    }

    private Optional<Integer> legacyVisionSurgery(int year, int month) {
        return Optional.ofNullable(LEGACY_VISION_SURGERY.getOrDefault(year, Map.of()).get(month));
    }

    /**
     * 당해연도(라이브) 포함 요청은 캐시하지 않는다.
     * OPERATIONDATA/Cataract_Operationdata는 시점마다 변동하므로 영구 파일캐시에 동결되면 안 됨.
     * (2024~2026 1~4월 시력교정은 레거시 상수로 덮어쓰지만 그 외 월/유형은 라이브)
     */
    private boolean isLiveRequest(List<Integer> years) {
        int currentYear = Year.now().getValue();
        return years.stream().anyMatch(y -> y >= currentYear);
    }

    private Optional<List<SurgeryMonthlyItem>> readCache(List<Integer> years) {
        if (!cacheEnabled || isLiveRequest(years)) {
            return Optional.empty();
        }

        Path file = cacheFile(years);
        if (!Files.exists(file)) {
            return Optional.empty();
        }

        try {
            return Optional.of(objectMapper.readValue(
                    file.toFile(),
                    new TypeReference<List<SurgeryMonthlyItem>>() {}
            ));
        } catch (IOException ignored) {
            return Optional.empty();
        }
    }

    private void writeCache(List<Integer> years, List<SurgeryMonthlyItem> rows) {
        if (!cacheEnabled || isLiveRequest(years)) {
            return;
        }

        Path file = cacheFile(years);
        try {
            Files.createDirectories(file.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), rows);
        } catch (IOException ignored) {
            // 캐시 저장 실패는 통계 조회 자체를 막지 않는다.
        }
    }

    private Path cacheFile(List<Integer> years) {
        String key = String.join("_", years.stream().map(String::valueOf).toList());
        return Path.of(cacheDir).toAbsolutePath().normalize()
                .resolve("surgery-monthly-v3-" + key + ".json");
    }

    /** 시력교정 + 백내장 병합용 가변 버킷 */
    private static class Bucket {
        final int year;
        final int month;
        int lasek, lasik, smile, smilePro;
        int icl, tIcl, kpl, tKpl, viva;
        int catMulti, catMono, catEdof;
        int xtra, waveVision, monoVision;
        int reoperation;
        int visionPatients;
        int cataractPatients;

        Bucket(int year, int month) {
            this.year = year;
            this.month = month;
        }
    }
}
