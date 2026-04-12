package com.bviit.analytics.service.stats;

import com.bviit.analytics.dto.stats.SurgeryMonthlyItem;
import com.bviit.analytics.repository.stats.SurgeryStatsRepository;
import com.bviit.analytics.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.bviit.analytics.util.NumberUtils.toInt;

@Service
@Profile("mssql")
@RequiredArgsConstructor
public class SurgeryStatsService {

    private final SurgeryStatsRepository repository;

    /**
     * 연도별 월간 수술 유형별 환자 수 (레거시 기준).
     * 시력교정(OPERATIONDATA, 백내장 제외) + 백내장(Cataract_Operationdata) 두 쿼리 병합.
     */
    @Transactional(readOnly = true)
    public List<SurgeryMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Map<String, Object>> visionRows = repository.findVisionMonthlyByType(years);
        List<Map<String, Object>> cataractRows = repository.findCataractMonthlyByType(years);

        Map<String, Bucket> map = MonthlyBuckets.initialize(years, Bucket::new);

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
            b.visionPatients = toInt(row.get("visionPatients"));
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

        // DTO 변환
        List<SurgeryMonthlyItem> result = new ArrayList<>();
        for (Bucket b : map.values()) {
            result.add(SurgeryMonthlyItem.builder()
                    .year(b.year).month(b.month)
                    .lasek(b.lasek).lasik(b.lasik).smile(b.smile).smilePro(b.smilePro)
                    .icl(b.icl).tIcl(b.tIcl).kpl(b.kpl).tKpl(b.tKpl).viva(b.viva)
                    .catMulti(b.catMulti).catMono(b.catMono).catEdof(b.catEdof)
                    .visionPatients(b.visionPatients)
                    .cataractPatients(b.cataractPatients)
                    .total(b.visionPatients + b.cataractPatients)
                    .build());
        }

        return result;
    }

    /** 시력교정 + 백내장 병합용 가변 버킷 */
    private static class Bucket {
        final int year;
        final int month;
        int lasek, lasik, smile, smilePro;
        int icl, tIcl, kpl, tKpl, viva;
        int catMulti, catMono, catEdof;
        int visionPatients;
        int cataractPatients;

        Bucket(int year, int month) {
            this.year = year;
            this.month = month;
        }
    }
}
