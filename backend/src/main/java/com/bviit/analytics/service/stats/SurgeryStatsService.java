package com.bviit.analytics.service.stats;

import com.bviit.analytics.dto.stats.SurgeryMonthlyItem;
import com.bviit.analytics.repository.stats.SurgeryStatsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Profile("mssql")
@RequiredArgsConstructor
public class SurgeryStatsService {

    private final SurgeryStatsRepository repository;

    /**
     * 연도별 월간 수술 유형별 건수.
     * OPERATIONDATA(시력교정+렌즈) + Cataract_Operationdata(백내장) 두 쿼리 결과를 머지.
     */
    @Transactional(readOnly = true)
    public List<SurgeryMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Map<String, Object>> visionRows = repository.findVisionMonthlyByType(years);
        List<Map<String, Object>> cataractRows = repository.findCataractMonthlyByType(years);

        // 연도×12개월 초기 맵 (빈 달 = 0)
        Map<String, int[]> map = new LinkedHashMap<>();
        for (int year : years) {
            for (int m = 1; m <= 12; m++) {
                // [lasek, lasik, smile, smilePro, icl, tIcl, kpl, tKpl, viva, catMulti, catMono, catEdof]
                map.put(year + "-" + m, new int[12]);
            }
        }

        // 시력교정 결과 머지
        for (Map<String, Object> row : visionRows) {
            String key = toInt(row.get("yr")) + "-" + toInt(row.get("mo"));
            int[] counts = map.get(key);
            if (counts == null) continue;

            counts[0] += toInt(row.get("lasek"));
            counts[1] += toInt(row.get("lasik"));
            counts[2] += toInt(row.get("smile"));
            counts[3] += toInt(row.get("smilePro"));
            counts[4] += toInt(row.get("icl"));
            counts[5] += toInt(row.get("tIcl"));
            counts[6] += toInt(row.get("kpl"));
            counts[7] += toInt(row.get("tKpl"));
            counts[8] += toInt(row.get("viva"));
        }

        // 백내장 결과 머지
        for (Map<String, Object> row : cataractRows) {
            String key = toInt(row.get("yr")) + "-" + toInt(row.get("mo"));
            int[] counts = map.get(key);
            if (counts == null) continue;

            counts[9] += toInt(row.get("catMulti"));
            counts[10] += toInt(row.get("catMono"));
            counts[11] += toInt(row.get("catEdof"));
        }

        // DTO 변환
        List<SurgeryMonthlyItem> result = new ArrayList<>();
        for (Map.Entry<String, int[]> entry : map.entrySet()) {
            String[] parts = entry.getKey().split("-");
            int year = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);
            int[] c = entry.getValue();
            int total = 0;
            for (int v : c) total += v;

            result.add(SurgeryMonthlyItem.builder()
                    .year(year).month(month)
                    .lasek(c[0]).lasik(c[1]).smile(c[2]).smilePro(c[3])
                    .icl(c[4]).tIcl(c[5]).kpl(c[6]).tKpl(c[7]).viva(c[8])
                    .catMulti(c[9]).catMono(c[10]).catEdof(c[11])
                    .total(total)
                    .build());
        }

        return result;
    }

    private static int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number n) return n.intValue();
        return Integer.parseInt(val.toString());
    }
}
