package com.bviit.analytics.service.reservation;

import com.bviit.analytics.dto.reservation.CataractStatsDailyRow;
import com.bviit.analytics.dto.reservation.ReservationStatsDailyRow;

import java.util.List;
import java.util.function.ToIntFunction;

/**
 * 예약통계 진단 필드 registry.
 * 같은 field name이 diff API, drill-down API, 프론트 CSV, SQL 매핑을 연결하므로 흩어두지 않는다.
 */
final class ReservationStatsFieldRegistry {

    static final List<ReservationStatsField<ReservationStatsDailyRow>> SYSTEM_FIELDS = List.of(
            field("inboundCall", ReservationStatsDailyRow::inboundCall),
            field("answeredCall", ReservationStatsDailyRow::answeredCall),
            field("newInquiry", ReservationStatsDailyRow::newInquiry),
            field("callReservation", ReservationStatsDailyRow::callReservation),
            field("tmTotalDb", ReservationStatsDailyRow::tmTotalDb),
            field("tmValidDb", ReservationStatsDailyRow::tmValidDb),
            field("tmReservation", ReservationStatsDailyRow::tmReservation),
            field("tmRecounsel", ReservationStatsDailyRow::tmRecounsel),
            field("tmRecounselValid", ReservationStatsDailyRow::tmRecounselValid),
            field("tmRecounselReservation", ReservationStatsDailyRow::tmRecounselReservation),
            field("homeReceived", ReservationStatsDailyRow::homeReceived),
            field("homeReservation", ReservationStatsDailyRow::homeReservation),
            field("naverReceived", ReservationStatsDailyRow::naverReceived),
            field("naverRejected", ReservationStatsDailyRow::naverRejected),
            field("naverValid", ReservationStatsDailyRow::naverValid),
            field("naverReservation", ReservationStatsDailyRow::naverReservation),
            field("kakaoInquiry", ReservationStatsDailyRow::kakaoInquiry),
            field("kakaoReservation", ReservationStatsDailyRow::kakaoReservation),
            field("cancelCallNaver", ReservationStatsDailyRow::cancelCallNaver),
            field("cancelHome", ReservationStatsDailyRow::cancelHome),
            field("cancelKakao", ReservationStatsDailyRow::cancelKakao),
            field("visit", ReservationStatsDailyRow::visit),
            field("noShowReservation", ReservationStatsDailyRow::noShowReservation),
            field("cancel", ReservationStatsDailyRow::cancel)
    );

    static final List<ReservationStatsField<CataractStatsDailyRow>> CATARACT_FIELDS = List.of(
            field("totalCataract", CataractStatsDailyRow::totalCataract),
            zeroField("totalPresbyopia", CataractStatsDailyRow::totalPresbyopia),
            zeroField("inboundCall", CataractStatsDailyRow::inboundCall),
            zeroField("answeredCall", CataractStatsDailyRow::answeredCall),
            field("newExamInquiry", CataractStatsDailyRow::newExamInquiry),
            field("newReInquiry", CataractStatsDailyRow::newReInquiry),
            field("newPatient", CataractStatsDailyRow::newPatient),
            field("tmTotalDb", CataractStatsDailyRow::tmTotalDb),
            field("tmValidDb", CataractStatsDailyRow::tmValidDb),
            field("tmReservation", CataractStatsDailyRow::tmReservation),
            field("kakaoTotalInquiry", CataractStatsDailyRow::kakaoTotalInquiry),
            field("kakaoCataractReservation", CataractStatsDailyRow::kakaoCataractReservation),
            field("kakaoPresbyopiaReservation", CataractStatsDailyRow::kakaoPresbyopiaReservation),
            field("onlineReservation", CataractStatsDailyRow::onlineReservation),
            zeroField("onlineNoShow", CataractStatsDailyRow::onlineNoShow),
            field("cancelOnline", CataractStatsDailyRow::cancelOnline),
            field("cancelCrm", CataractStatsDailyRow::cancelCrm),
            field("cancelKakao", CataractStatsDailyRow::cancelKakao),
            field("visit", CataractStatsDailyRow::visit),
            field("noShowReservation", CataractStatsDailyRow::noShowReservation),
            field("cancel", CataractStatsDailyRow::cancel)
    );

    private ReservationStatsFieldRegistry() {
    }

    private static <T> ReservationStatsField<T> field(String name, ToIntFunction<T> value) {
        return new ReservationStatsField<>(name, value, true);
    }

    private static <T> ReservationStatsField<T> zeroField(String name, ToIntFunction<T> value) {
        return new ReservationStatsField<>(name, value, false);
    }
}
