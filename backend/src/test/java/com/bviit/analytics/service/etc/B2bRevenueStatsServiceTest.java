package com.bviit.analytics.service.etc;

import com.bviit.analytics.dto.etc.B2bRevenueMonthlyItem;
import com.bviit.analytics.repository.etc.B2bRevenueStatsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class B2bRevenueStatsServiceTest {

    @Mock
    private B2bRevenueStatsRepository repository;

    @InjectMocks
    private B2bRevenueStatsService service;

    @Test
    void getMonthlyRevenueFillsMissingMonthsWithZeroItems() {
        when(repository.findMonthlyRevenue(List.of(2025))).thenReturn(List.of(
                row(
                        "yr", 2025,
                        "mo", 3,
                        "totalRevenue", 100,
                        "caseCount", 2,
                        "avgRevenuePerCase", 50,
                        "visionRevenue", 70,
                        "cataractRevenue", 30,
                        "visionCount", 1,
                        "cataractCount", 1,
                        "designatedRevenue", 40,
                        "nonDesignatedRevenue", 60,
                        "designatedCount", 1,
                        "nonDesignatedCount", 1,
                        "opCost", 10,
                        "examCost", 20,
                        "dnaCost", 5,
                        "prpCost", 6,
                        "etcCost", 7,
                        "presbyopiaCost", 8,
                        "hospitalSupplyCost", 9
                )
        ));

        List<B2bRevenueMonthlyItem> items = service.getMonthlyRevenue(List.of(2025));

        assertThat(items).hasSize(12);
        assertThat(items.get(0).getMonth()).isEqualTo(1);
        assertThat(items.get(0).getTotalRevenue()).isZero();
        assertThat(items.get(2).getMonth()).isEqualTo(3);
        assertThat(items.get(2).getTotalRevenue()).isEqualTo(100);
        assertThat(items.get(2).getHospitalSupplyCost()).isEqualTo(9);
    }

    private Map<String, Object> row(Object... values) {
        Map<String, Object> row = new HashMap<>();
        for (int index = 0; index < values.length; index += 2) {
            row.put(String.valueOf(values[index]), values[index + 1]);
        }
        return row;
    }
}
