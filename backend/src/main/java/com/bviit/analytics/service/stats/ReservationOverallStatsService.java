package com.bviit.analytics.service.stats;

import com.bviit.analytics.dto.stats.ReservationOverallMonthlyItem;
import com.bviit.analytics.repository.stats.ReservationOverallStatsRepository;
import com.bviit.analytics.util.MonthlyBuckets;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.bviit.analytics.util.NumberUtils.toInt;

/**
 * 예약 종합(콜, 온라인) / 온라인 예약 서비스.
 *
 *   - 2024~2025: 레거시 BCRM 문의통계(RSS) 종합·온라인 확정값 고정.
 *   - 2026년 이후: 운영 DB 추정치(등록일 InsertedDateTime 기준). mssql 프로파일에서만 계산.
 *       · 콜    = RESERVE_PATH CTI/CRM, B2B(군인)·재검·중복 예약 제외(RESERVE_SEQ '8'/'5', COMMENT).
 *       · 온라인 = RESERVE_PATH ONLINE/APP(홈페이지) + NAVER(네이버). 카카오는 RESERVE_PATH 부재로 미포함.
 *       · 종합  = 콜 + 온라인.
 *     레거시 RSS 화면(uSTATISTICSD1) 정의에 맞춘 보정으로 2026 차트와 월 ±1~3% 일치(상세는 Repository 주석).
 *
 * ⚠️ 레거시 공식값(콜센터 MySQL·해피톡 다중 소스, 일부 폐기된 수기 테이블)은 완전 재현 불가하나, 위 보정으로
 * 실용 수준 근접. 2026 라인은 추정치이며 당월까지만 신뢰. 원본 산식: {@code uSTATISTICSD1Sql.cs}.
 */
@Service
@RequiredArgsConstructor
public class ReservationOverallStatsService {

    /** 예약 종합(콜+온라인) 확정값. */
    private static final Map<Integer, int[]> LEGACY_RESERVATION_OVERALL = Map.of(
            2024, new int[] {2799, 1651, 1174, 1092, 1264, 1317, 1569, 1641, 1206, 1231, 1967, 2589},
            2025, new int[] {2759, 1945, 1204, 1357, 1219, 1318, 1581, 1315, 1645, 1031, 1473, 2209}
    );

    /** 온라인 예약(네이버·카카오·홈페이지) 확정값. */
    private static final Map<Integer, int[]> LEGACY_ONLINE_RESERVATION = Map.of(
            2024, new int[] {1466, 943, 707, 599, 575, 578, 716, 879, 672, 662, 1001, 1292},
            2025, new int[] {1334, 878, 548, 583, 501, 529, 608, 551, 791, 477, 573, 975}
    );

    /** 콜 예약(인콜·아웃콜) 확정값. */
    private static final Map<Integer, int[]> LEGACY_CALL_RESERVATION = Map.of(
            2024, new int[] {1333, 708, 467, 493, 689, 739, 853, 762, 534, 569, 966, 1297},
            2025, new int[] {1425, 1067, 656, 774, 718, 789, 973, 764, 854, 554, 900, 1234}
    );

    /** mssql 프로파일에서만 주입됨. 없으면(H2 개발) 2026 이후는 데이터 없음(null). */
    private final Optional<ReservationOverallStatsRepository> repository;

    public List<ReservationOverallMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();

        int minYear = normalizedYears.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = normalizedYears.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String from = minYear + "-01-01";
        String to = maxYear + "-12-31 23:59:59";

        List<Map<String, Object>> rows = repository
                .map(repo -> repo.findReservationOverallMonthly(from, to))
                .orElseGet(List::of);
        Map<String, Integer> dbTotal = new HashMap<>();
        Map<String, Integer> dbOnline = new HashMap<>();
        Map<String, Integer> dbCall = new HashMap<>();
        for (Map<String, Object> row : rows) {
            String key = MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo")));
            dbTotal.put(key, toInt(row.get("cnt")));
            dbOnline.put(key, toInt(row.get("online_cnt")));
            dbCall.put(key, toInt(row.get("call_cnt")));
        }

        // 미래 예약 특성상 당월 이후는 아직 예약이 다 쌓이지 않아 급감 → 그래프 왜곡 방지로 null 처리
        YearMonth currentMonth = YearMonth.now();

        List<ReservationOverallMonthlyItem> items = new ArrayList<>();
        for (Integer year : normalizedYears) {
            for (int month = 1; month <= 12; month++) {
                final int y = year;
                final int m = month;
                final String key = MonthlyBuckets.key(y, m);
                final boolean future = YearMonth.of(y, m).isAfter(currentMonth);

                // 2024~2025는 레거시 확정값, 그 외 연도는 운영 DB 추정치(미래월·미주입 시 null)
                Integer total = legacyValue(LEGACY_RESERVATION_OVERALL, y, m)
                        .orElseGet(() -> future ? null : dbTotal.get(key));
                Integer online = legacyValue(LEGACY_ONLINE_RESERVATION, y, m)
                        .orElseGet(() -> future ? null : dbOnline.get(key));
                Integer call = legacyValue(LEGACY_CALL_RESERVATION, y, m)
                        .orElseGet(() -> future ? null : dbCall.get(key));

                items.add(ReservationOverallMonthlyItem.builder()
                        .year(y)
                        .month(m)
                        .reservations(total)
                        .online(online)
                        .call(call)
                        .total(total)
                        .build());
            }
        }

        return items;
    }

    private Optional<Integer> legacyValue(Map<Integer, int[]> table, int year, int month) {
        int[] values = table.get(year);
        if (values == null || month < 1 || month > values.length) {
            return Optional.empty();
        }
        return Optional.of(values[month - 1]);
    }
}
