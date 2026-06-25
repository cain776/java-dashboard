package com.bviit.analytics.controller.consultation;

import com.bviit.analytics.controller.stats.StatsRequestValidator;
import com.bviit.analytics.controller.stats.StatsPanelSupport;

import com.bviit.analytics.dto.ApiResponse;
import com.bviit.analytics.dto.consultation.CataractReservationRateItem;
import com.bviit.analytics.service.consultation.CataractReservationRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/stats/cataract-reservation-rate")
@RequiredArgsConstructor
public class CataractReservationRateController {

    private final Optional<CataractReservationRateService> realService;

    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<List<CataractReservationRateItem>>> getTrend(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "cataract") String category
    ) {
        StatsRequestValidator.validateYears(years);
        return StatsPanelSupport.require(
                realService,
                service -> service.getMonthlyRates(years, category)
        );
    }
}
