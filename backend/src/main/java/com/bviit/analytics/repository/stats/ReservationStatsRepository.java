package com.bviit.analytics.repository.stats;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * RESERVATION 테이블 기반 예약 통계 쿼리.
 * MSSQL 2014 호환: STRING_AGG, TRIM 등 사용 금지.
 * READ-ONLY — SELECT만 실행.
 * mssql 프로파일에서만 활성화 — H2 기본 부팅 시 빈 생성 안 됨.
 */
@Repository
@Profile("mssql")
public class ReservationStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ReservationStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    private MapSqlParameterSource dateParams(String from, String to) {
        return new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
    }

    /**
     * 요약: 전체 예약, 검사 완료(FLAG=F), 취소, 당일 예약
     */
    public Map<String, Object> findSummary(String from, String to) {
        String sql = """
            SELECT
                COUNT(*) AS totalReservations,
                SUM(CASE WHEN RESERVE_FLAG = 'F' THEN 1 ELSE 0 END) AS completedExaminations,
                SUM(CASE WHEN RESERVE_STATE = 'C' THEN 1 ELSE 0 END) AS cancellations,
                SUM(CASE WHEN TODAY_FLAG = 'Y' THEN 1 ELSE 0 END) AS walkInReservations
            FROM RESERVATION WITH(NOLOCK)
            WHERE RESERVE_DATE >= :from AND RESERVE_DATE <= :to
            """;
        return jdbc.queryForMap(sql, dateParams(from, to));
    }

    /**
     * 이전 기간 요약 (변화율 계산용)
     */
    public Map<String, Object> findPrevSummary(String prevFrom, String prevTo) {
        return findSummary(prevFrom, prevTo);
    }

    /**
     * 일별 추이: 예약/검사/취소
     */
    public List<Map<String, Object>> findDailyTrend(String from, String to) {
        String sql = """
            SELECT
                RESERVE_DATE AS date,
                COUNT(*) AS reservations,
                SUM(CASE WHEN RESERVE_FLAG = 'F' THEN 1 ELSE 0 END) AS examinations,
                SUM(CASE WHEN RESERVE_STATE = 'C' THEN 1 ELSE 0 END) AS cancellations
            FROM RESERVATION WITH(NOLOCK)
            WHERE RESERVE_DATE >= :from AND RESERVE_DATE <= :to
            GROUP BY RESERVE_DATE
            ORDER BY RESERVE_DATE
            """;
        return jdbc.queryForList(sql, dateParams(from, to));
    }

    /**
     * 유입 채널별 건수.
     * RESERVE_PATH 매핑:
     *   CTI → phone, NAVER → naver, KAKAO → kakao,
     *   TODAY_FLAG='Y' → walkIn (별도 집계),
     *   나머지(CRM, APP, ONLINE, EMR, Kiosk 등) → referral(기타)
     */
    public List<Map<String, Object>> findSourceBreakdown(String from, String to) {
        String sql = """
            SELECT
                CASE
                    WHEN RTRIM(ISNULL(RESERVE_PATH,'')) = 'CTI' THEN 'phone'
                    WHEN RTRIM(ISNULL(RESERVE_PATH,'')) = 'NAVER' THEN 'naver'
                    WHEN RTRIM(ISNULL(RESERVE_PATH,'')) = 'KAKAO' THEN 'kakao'
                    WHEN TODAY_FLAG = 'Y' THEN 'walkIn'
                    ELSE 'referral'
                END AS source,
                COUNT(*) AS count
            FROM RESERVATION WITH(NOLOCK)
            WHERE RESERVE_DATE >= :from AND RESERVE_DATE <= :to
                AND RESERVE_STATE <> 'C'
            GROUP BY
                CASE
                    WHEN RTRIM(ISNULL(RESERVE_PATH,'')) = 'CTI' THEN 'phone'
                    WHEN RTRIM(ISNULL(RESERVE_PATH,'')) = 'NAVER' THEN 'naver'
                    WHEN RTRIM(ISNULL(RESERVE_PATH,'')) = 'KAKAO' THEN 'kakao'
                    WHEN TODAY_FLAG = 'Y' THEN 'walkIn'
                    ELSE 'referral'
                END
            ORDER BY count DESC
            """;
        return jdbc.queryForList(sql, dateParams(from, to));
    }

    /**
     * 월별 수술/외래/드림렌즈 건수 (연도 목록 기준).
     * RESERVE_FLAG: O=수술, D=드림렌즈
     * RESERVE_JINRYO: 2=외래
     */
    public List<Map<String, Object>> findMonthlyByType(List<Integer> years) {
        // JTDS 호환: YEAR() IN (:param)이 테이블 힌트로 오인됨 → 날짜 범위로 우회
        int minYear = years.stream().mapToInt(Integer::intValue).min().orElse(2025);
        int maxYear = years.stream().mapToInt(Integer::intValue).max().orElse(2026);
        String fromDate = minYear + "-01-01";
        String toDate = maxYear + "-12-31";

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", fromDate)
                .addValue("to", toDate);

        String sql = """
            SELECT
                YEAR(r.RESERVE_DATE) AS yr,
                MONTH(r.RESERVE_DATE) AS mo,
                SUM(CASE WHEN r.RESERVE_FLAG = 'O' THEN 1 ELSE 0 END) AS surgery,
                SUM(CASE WHEN r.RESERVE_JINRYO = '2' THEN 1 ELSE 0 END) AS outpatient,
                SUM(CASE WHEN r.RESERVE_FLAG = 'D' THEN 1 ELSE 0 END) AS dreamlens
            FROM RESERVATION r WITH(NOLOCK)
            WHERE r.RESERVE_DATE >= :from AND r.RESERVE_DATE <= :to
                AND r.RESERVE_STATE <> 'C'
            GROUP BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)
            ORDER BY YEAR(r.RESERVE_DATE), MONTH(r.RESERVE_DATE)
            """;
        return jdbc.queryForList(sql, params);
    }

    /**
     * 시간대별 분포 (1시간 단위, 08~19시)
     * START_TIME 형식: 'HH:mm'
     */
    public List<Map<String, Object>> findHourlyDistribution(String from, String to) {
        String sql = """
            SELECT
                LEFT(RTRIM(START_TIME), 2) + ':00' AS slot,
                COUNT(*) AS count
            FROM RESERVATION WITH(NOLOCK)
            WHERE RESERVE_DATE >= :from AND RESERVE_DATE <= :to
                AND RESERVE_STATE <> 'C'
                AND START_TIME IS NOT NULL
                AND RTRIM(START_TIME) <> ''
            GROUP BY LEFT(RTRIM(START_TIME), 2)
            ORDER BY LEFT(RTRIM(START_TIME), 2)
            """;
        return jdbc.queryForList(sql, dateParams(from, to));
    }
}
