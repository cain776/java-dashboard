package com.bviit.analytics.outpatient.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.outpatient.dto.OutpatientReservationStatsDailyRow;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.regex.Pattern;

/**
 * 외래 예약통계 — 일자별 원시 카운트 라이브 집계(외래 = RESERVE_FLAG='F').
 *
 * 채널 소스(2026-07 배선):
 *   - 콜 예약/변경/취소: CtiRptLst(외래 CtiCtgCod='F', 인입 clgIOF='I') CtiGbnCod M/A/C
 *   - 어플/현장 예약/취소: RESERVATION(FLAG='F') 예약등록일(RESERVE_NUM YYMMDD), APP/CRM 경로
 *   - 부도: RESERVATION(FLAG='F') 예약일(RESERVE_DATE) 기준 STATE='Y' 과거일, 경로별
 * 미배선(0): 인입/응대콜(EICN 큐)·문의만(상담등록)·카톡(HappyTalk 외래 카테고리) — SQL 주석 참조.
 *
 * 날짜 바인딩: MSSQL 측은 :from/:to 네임드 파라미터, OPENQUERY 내부(EICN MySQL 리터럴)는 바인딩 불가하므로
 * ISO(yyyy-MM-dd) 재검증 후 __OQ_FROM__/__OQ_TO__ 치환(주입 방지, 시력교정 repo와 동일 패턴).
 *
 * READ-ONLY · MSSQL 2014 호환(WITH(NOLOCK), 네임드 파라미터 :from/:to).
 */
@Repository
@Profile("mssql")
public class OutpatientReservationStatsRepository {

    private static final String SQL_LOCATION = "sql/outpatient/outpatient-reservation-stats-daily.sql";
    private static final Pattern ISO_DATE = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");

    private final NamedParameterJdbcTemplate jdbc;
    private final String sql;

    public OutpatientReservationStatsRepository(@Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.sql = SqlLoader.load(SQL_LOCATION);
    }

    public List<OutpatientReservationStatsDailyRow> findDailyCounts(String from, String to) {
        return jdbc.query(resolveOpenQuerySql(sql, from, to),
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, n) -> new OutpatientReservationStatsDailyRow(
                        rs.getString("d"),
                        rs.getInt("inboundCall"), rs.getInt("answeredCall"), rs.getInt("inquiryOnly"),
                        rs.getInt("appReservation"), rs.getInt("appCancel"),
                        rs.getInt("crmReservation"), rs.getInt("crmCancel"),
                        rs.getInt("reservationChange"), rs.getInt("callReservation"), rs.getInt("callCancel"),
                        rs.getInt("kakaoAll"), rs.getInt("kakaoReservation"), rs.getInt("kakaoCancel"),
                        rs.getInt("noShowCti"), rs.getInt("noShowApp"), rs.getInt("noShowCrm")));
    }

    /** OPENQUERY(EICN) 리터럴 치환 전 ISO 형식 재검증(주입 방지). 컨트롤러가 LocalDate로 이미 검증하나 이중 가드. */
    static String resolveOpenQuerySql(String baseSql, String from, String to) {
        if (from == null || to == null || !ISO_DATE.matcher(from).matches() || !ISO_DATE.matcher(to).matches()) {
            throw new IllegalArgumentException("from/to must be ISO yyyy-MM-dd dates");
        }
        return baseSql.replace("__OQ_FROM__", from).replace("__OQ_TO__", to);
    }
}
