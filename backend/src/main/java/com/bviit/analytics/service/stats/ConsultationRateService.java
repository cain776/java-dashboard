package com.bviit.analytics.service.stats;

import com.bviit.analytics.dto.stats.ConsultationRateItem;
import com.bviit.analytics.repository.stats.ConsultationRateRepository;
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
public class ConsultationRateService {

    private final ConsultationRateRepository repository;

    @Transactional(readOnly = true)
    public List<ConsultationRateItem> getMonthlyRates(List<Integer> years) {
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String fromDate = minYear + "-01-01";
        String toDate = maxYear + "-12-31";

        // RESERVATION 기반: 수술전환율 + 백내장전환율
        List<Map<String, Object>> reservationRows = repository.findMonthlyConversionData(fromDate, toDate);
        // EXAM 기반: 상담수 (중단·BS미지시 제외)
        List<Map<String, Object>> counselRows = repository.findMonthlyCounselData(fromDate, toDate);

        // 상담수 맵
        Map<String, Integer> counselMap = new LinkedHashMap<>();
        for (Map<String, Object> row : counselRows) {
            counselMap.put(toInt(row.get("yr")) + "-" + toInt(row.get("mo")), toInt(row.get("counselCount")));
        }

        // 연도×12 초기화
        Map<String, ConsultationRateItem> result = new LinkedHashMap<>();
        for (int year : years) {
            for (int m = 1; m <= 12; m++) {
                result.put(year + "-" + m, ConsultationRateItem.builder()
                        .year(year).month(m)
                        .visionExamCount(0).visionSurgeryCount(0).visionSurgeryRate(0)
                        .visionCounselCount(0).visionCounselRate(0)
                        .cataractExamCount(0).cataractSurgeryCount(0).cataractSurgeryRate(0)
                        .build());
            }
        }

        // RESERVATION 데이터 + EXAM 상담수 병합
        for (Map<String, Object> row : reservationRows) {
            int yr = toInt(row.get("yr"));
            int mo = toInt(row.get("mo"));
            String key = yr + "-" + mo;
            if (!result.containsKey(key)) continue;

            int ve = toInt(row.get("visionExam"));
            int vs = toInt(row.get("visionSurgery"));
            int ce = toInt(row.get("cataractExam"));
            int cs = toInt(row.get("cataractSurgery"));
            int counsel = counselMap.getOrDefault(key, 0);

            result.put(key, ConsultationRateItem.builder()
                    .year(yr).month(mo)
                    .visionExamCount(ve)
                    .visionSurgeryCount(vs)
                    .visionSurgeryRate(ve > 0 ? round(vs * 100.0 / ve) : 0)
                    .visionCounselCount(counsel)
                    .visionCounselRate(counsel > 0 ? round(vs * 100.0 / counsel) : 0)
                    .cataractExamCount(ce)
                    .cataractSurgeryCount(cs)
                    .cataractSurgeryRate(ce > 0 ? round(cs * 100.0 / ce) : 0)
                    .build());
        }

        return new ArrayList<>(result.values());
    }

    private static int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number n) return n.intValue();
        return Integer.parseInt(val.toString());
    }

    private static double round(double val) {
        return Math.round(val * 10.0) / 10.0;
    }
}
