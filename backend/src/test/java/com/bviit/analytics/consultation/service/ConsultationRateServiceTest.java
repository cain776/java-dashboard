package com.bviit.analytics.consultation.service;

import com.bviit.analytics.consultation.dto.ConsultationRateItem;
import com.bviit.analytics.consultation.repository.ConsultationRateRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.offset;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConsultationRateServiceTest {

    @Mock
    private ConsultationRateRepository repository;

    @InjectMocks
    private ConsultationRateService service;

    @Test
    void getMonthlyRatesRoundsRatesAndKeepsMissingMonthsAtZero() {
        when(repository.findMonthlyVisionRates("2025-01-01", "2025-12-31")).thenReturn(List.of(
                row(
                        "yr", 2025,
                        "mo", 2,
                        "examCount", 3,
                        "counselCount", 2,
                        "surgeryBookedCount", 1,
                        "actualSurgeryCount", 1
                )
        ));
        when(repository.findMonthlyCataractRates("2025-01-01", "2025-12-31")).thenReturn(List.of(
                row(
                        "yr", 2025,
                        "mo", 2,
                        "examCount", 4,
                        "surgeryBookedCount", 1,
                        "stoppedCount", 1
                )
        ));

        List<ConsultationRateItem> items = service.getMonthlyRates(List.of(2025));

        assertThat(items).hasSize(12);
        assertThat(items.get(0).getMonth()).isEqualTo(1);
        assertThat(items.get(0).getVisionExamCount()).isZero();
        assertThat(items.get(1).getMonth()).isEqualTo(2);
        assertThat(items.get(1).getVisionSurgeryRate()).isCloseTo(33.3, offset(0.001));
        assertThat(items.get(1).getVisionCounselRate()).isCloseTo(50.0, offset(0.001));
        assertThat(items.get(1).getCataractSurgeryRate()).isCloseTo(25.0, offset(0.001));
    }

    private Map<String, Object> row(Object... values) {
        Map<String, Object> row = new HashMap<>();
        for (int index = 0; index < values.length; index += 2) {
            row.put(String.valueOf(values[index]), values[index + 1]);
        }
        return row;
    }
}
