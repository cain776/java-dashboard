package com.bviit.analytics.repository.stats;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 검사 중단 사유 통계 쿼리.
 *
 * 검사 중단(EXAM.STOP_YN='Y') 건을 EXAM_MEMO 키워드로 분류한 월별 사유별 건수.
 * ⚠️ 중단 사유는 DB에 코드가 없고 EXAM_MEMO(자유텍스트)에만 있어 키워드 LIKE로 추정한다.
 *   분류 우선순위(위에서 먼저 매칭): 아벨리노 > 원추각막 > 녹내장 > 렌즈삽입 > 시력변화 > 수술권유X > 기타.
 *   메모는 공백/탭/개행 제거 + 소문자화 후 매칭('권유 x'·'권유X' → '권유x').
 *   약어·표기 변형(렌삽/ICL, 권유안/비권유/수술불가, 시력변동 등)을 함께 잡는다.
 *
 * READ-ONLY — SELECT만 실행. 날짜 컬럼은 char(10) 'YYYY-MM-DD'.
 */
@Repository
@Profile("mssql")
public class StopReasonStatsRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public StopReasonStatsRepository(
            @Qualifier("statsJdbcTemplate") NamedParameterJdbcTemplate jdbc
    ) {
        this.jdbc = jdbc;
    }

    /** 월별 중단 사유 분류 건수. */
    public List<Map<String, Object>> findStopReasonMonthly(String from, String to) {
        String sql = """
            SELECT t.yr, t.mo,
                   SUM(CASE WHEN t.cat = 'recommendX'    THEN 1 ELSE 0 END) AS recommendX,
                   SUM(CASE WHEN t.cat = 'lensImpossible' THEN 1 ELSE 0 END) AS lensImpossible,
                   SUM(CASE WHEN t.cat = 'keratoconus'   THEN 1 ELSE 0 END) AS keratoconus,
                   SUM(CASE WHEN t.cat = 'avellino'      THEN 1 ELSE 0 END) AS avellino,
                   SUM(CASE WHEN t.cat = 'glaucoma'      THEN 1 ELSE 0 END) AS glaucoma,
                   SUM(CASE WHEN t.cat = 'visionChange'  THEN 1 ELSE 0 END) AS visionChange,
                   SUM(CASE WHEN t.cat = 'other'         THEN 1 ELSE 0 END) AS other
            FROM (
                SELECT CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT) AS yr,
                       CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT) AS mo,
                       CASE
                           WHEN x.m LIKE N'%아벨리노%'
                             OR x.m LIKE N'%avellino%'
                             OR x.m LIKE N'%아벨%'       THEN 'avellino'
                           WHEN x.m LIKE N'%원추각막%'
                             OR x.m LIKE N'%원추%'
                             OR x.m LIKE N'%각막확장%'
                             OR x.m LIKE N'%keratoconus%' THEN 'keratoconus'
                           WHEN x.m LIKE N'%녹내장%'
                             OR x.m LIKE N'%glaucoma%'   THEN 'glaucoma'
                           WHEN x.m LIKE N'%렌즈삽입%'
                             OR x.m LIKE N'%렌삽%'
                             OR x.m LIKE N'%icl%'
                             OR x.m LIKE N'%안내렌즈%'   THEN 'lensImpossible'
                           WHEN x.m LIKE N'%시력변화%'
                             OR x.m LIKE N'%시력변동%'
                             OR x.m LIKE N'%시력불안정%'
                             OR x.m LIKE N'%시력저하%'
                             OR x.m LIKE N'%도수변화%'
                             OR x.m LIKE N'%도수변동%'
                             OR x.m LIKE N'%근시진행%'
                             OR x.m LIKE N'%변화있%'
                             OR x.m LIKE N'%변동있%'     THEN 'visionChange'
                           WHEN x.m LIKE N'%권유x%'
                             OR x.m LIKE N'%권유안%'
                             OR x.m LIKE N'%권유하지%'
                             OR x.m LIKE N'%비권유%'
                             OR x.m LIKE N'%수술권유안%'
                             OR x.m LIKE N'%수술불가%'
                             OR x.m LIKE N'%수술불가능%'
                             OR x.m LIKE N'%수술안됨%'
                             OR x.m LIKE N'%수술안되%'
                             OR x.m LIKE N'%op권유x%'
                             OR x.m LIKE N'%op권유안%'
                             OR x.m LIKE N'%op불가%'     THEN 'recommendX'
                           ELSE 'other'
                       END AS cat
                FROM EXAM e WITH(NOLOCK)
                CROSS APPLY (
                    SELECT LOWER(
                        REPLACE(
                        REPLACE(
                        REPLACE(
                        REPLACE(
                        REPLACE(ISNULL(e.EXAM_MEMO, ''), ' ', ''),
                            NCHAR(12288), ''),
                            CHAR(9), ''),
                            CHAR(13), ''),
                            CHAR(10), '')
                    ) AS m
                ) x
                WHERE e.STOP_YN = 'Y'
                  AND e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
            ) t
            GROUP BY t.yr, t.mo
            ORDER BY t.yr, t.mo
            """;
        return jdbc.queryForList(sql, new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to));
    }
}
