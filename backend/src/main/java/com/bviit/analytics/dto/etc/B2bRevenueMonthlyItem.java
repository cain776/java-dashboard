package com.bviit.analytics.dto.etc;

import lombok.Builder;
import lombok.Getter;

/**
 * B2B 매출 월별 집계 DTO.
 * 레거시 BCRM의 b2b-corp-settlement 기준으로 7개 수가 항목을 합산한다.
 */
@Getter
@Builder
public class B2bRevenueMonthlyItem {
    private final int year;
    private final int month;

    private final int totalRevenue;
    private final int caseCount;
    private final int avgRevenuePerCase;

    private final int visionRevenue;
    private final int cataractRevenue;
    private final int visionCount;
    private final int cataractCount;

    private final int designatedRevenue;
    private final int nonDesignatedRevenue;
    private final int designatedCount;
    private final int nonDesignatedCount;

    private final int opCost;
    private final int examCost;
    private final int dnaCost;
    private final int prpCost;
    private final int etcCost;
    private final int presbyopiaCost;
    private final int hospitalSupplyCost;
}
