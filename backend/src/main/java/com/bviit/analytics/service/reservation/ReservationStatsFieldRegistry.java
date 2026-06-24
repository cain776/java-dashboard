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
            field("inboundCall", "인입콜", ReservationStatsDailyRow::inboundCall),
            field("answeredCall", "응대콜", ReservationStatsDailyRow::answeredCall),
            field("newInquiry", "신규예약 문의", ReservationStatsDailyRow::newInquiry),
            field("callReservation", "예약수", ReservationStatsDailyRow::callReservation),
            field("tmTotalDb", "TM 총DB", ReservationStatsDailyRow::tmTotalDb),
            field("tmValidDb", "TM 유효DB", ReservationStatsDailyRow::tmValidDb),
            field("tmReservation", "TM 예약수", ReservationStatsDailyRow::tmReservation),
            field("tmRecounsel", "재상담", ReservationStatsDailyRow::tmRecounsel),
            field("tmRecounselValid", "재상담 유효", ReservationStatsDailyRow::tmRecounselValid),
            field("tmRecounselReservation", "재상담 예약수", ReservationStatsDailyRow::tmRecounselReservation),
            field("homeReceived", "홈페이지 예약접수", ReservationStatsDailyRow::homeReceived),
            field("homeReservation", "홈페이지 예약수", ReservationStatsDailyRow::homeReservation),
            field("naverReceived", "네이버 예약접수", ReservationStatsDailyRow::naverReceived),
            field("naverRejected", "네이버 예약접수 거절", ReservationStatsDailyRow::naverRejected),
            field("naverValid", "네이버 유효접수", ReservationStatsDailyRow::naverValid),
            field("naverReservation", "네이버 예약수", ReservationStatsDailyRow::naverReservation),
            field("kakaoInquiry", "카카오톡 문의", ReservationStatsDailyRow::kakaoInquiry),
            field("kakaoReservation", "카카오톡 예약", ReservationStatsDailyRow::kakaoReservation),
            field("cancelCallNaver", "콜·네이버 취소", ReservationStatsDailyRow::cancelCallNaver),
            field("cancelHome", "홈페이지 취소", ReservationStatsDailyRow::cancelHome),
            field("cancelKakao", "카카오톡 취소", ReservationStatsDailyRow::cancelKakao),
            field("visit", "내원", ReservationStatsDailyRow::visit),
            field("noShowReservation", "예약(부도)", ReservationStatsDailyRow::noShowReservation),
            field("cancel", "취소", ReservationStatsDailyRow::cancel)
    );

    static final List<ReservationStatsField<CataractStatsDailyRow>> CATARACT_FIELDS = List.of(
            field("totalCataract", "백내장", CataractStatsDailyRow::totalCataract),
            zeroField("totalPresbyopia", "노안", CataractStatsDailyRow::totalPresbyopia),
            zeroField("inboundCall", "총인입콜", CataractStatsDailyRow::inboundCall),
            zeroField("answeredCall", "응대콜", CataractStatsDailyRow::answeredCall),
            field("newExamInquiry", "신규문의", CataractStatsDailyRow::newExamInquiry),
            field("newReInquiry", "재문의", CataractStatsDailyRow::newReInquiry),
            field("newPatient", "신환", CataractStatsDailyRow::newPatient),
            field("tmTotalDb", "TM 총DB", CataractStatsDailyRow::tmTotalDb),
            field("tmValidDb", "TM 유효DB", CataractStatsDailyRow::tmValidDb),
            field("tmReservation", "TM 예약수", CataractStatsDailyRow::tmReservation),
            field("kakaoTotalInquiry", "카카오 총문의", CataractStatsDailyRow::kakaoTotalInquiry),
            field("kakaoCataractReservation", "카카오 검사예약", CataractStatsDailyRow::kakaoCataractReservation),
            field("kakaoPresbyopiaReservation", "카카오 노안", CataractStatsDailyRow::kakaoPresbyopiaReservation),
            field("onlineReservation", "온라인 예약", CataractStatsDailyRow::onlineReservation),
            zeroField("onlineNoShow", "온라인 부도", CataractStatsDailyRow::onlineNoShow),
            field("cancelOnline", "온라인 취소", CataractStatsDailyRow::cancelOnline),
            field("cancelCrm", "CRM 취소", CataractStatsDailyRow::cancelCrm),
            field("cancelKakao", "카카오 취소", CataractStatsDailyRow::cancelKakao),
            field("visit", "내원", CataractStatsDailyRow::visit),
            field("noShowReservation", "예약(부도)", CataractStatsDailyRow::noShowReservation),
            field("cancel", "취소", CataractStatsDailyRow::cancel)
    );

    private ReservationStatsFieldRegistry() {
    }

    private static <T> ReservationStatsField<T> field(String name, String label, ToIntFunction<T> value) {
        return new ReservationStatsField<>(name, label, value, true);
    }

    private static <T> ReservationStatsField<T> zeroField(String name, String label, ToIntFunction<T> value) {
        return new ReservationStatsField<>(name, label, value, false);
    }
}
