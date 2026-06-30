                SELECT
                    x.dt,
                    COUNT(*) AS reoperation,
                    SUM(CASE WHEN x.cat = 'lens' THEN 0 ELSE 1 END) AS reopLaser,
                    SUM(CASE WHEN x.cat = 'lens' THEN 1 ELSE 0 END) AS reopLens
                FROM (
                    SELECT
                        LEFT(y.d, 10) AS dt,
                        CASE WHEN (
                    y.qt LIKE '%remo%' OR y.qt LIKE '%exch%' OR y.qt LIKE '%ICL%'
                    OR y.qt LIKE '%ARF%' OR y.qt LIKE '%ART%' OR y.qt LIKE '%EVO%'
                    OR y.qt LIKE '%ECHO%' OR y.qt LIKE '%GLAZE%' OR y.qt LIKE '%precizon%'
                    OR y.qt LIKE '%Lisa%' OR y.qt LIKE '%Gemetric%' OR y.qt LIKE '%encla%'
                        ) THEN 'lens' ELSE 'laser' END AS cat
                    FROM (
                        SELECT
                            r.REOP_DATE AS d,
                            (CASE WHEN
                    r.AGAIN_R IS NOT NULL AND RTRIM(r.AGAIN_R) <> ''
                    AND r.AGAIN_R NOT LIKE 'Irrigation%'
                    AND r.AGAIN_R NOT LIKE 'repo%'
                    AND r.AGAIN_R NOT LIKE '%reposition%'
                    AND r.AGAIN_R NOT LIKE 'Clareon%'
                    AND r.AGAIN_R NOT LIKE 'T-Clareon%'
                    AND r.AGAIN_R NOT LIKE 'Tecnis%'
                    AND r.AGAIN_R NOT LIKE 'LAL%'
                    AND r.AGAIN_R NOT LIKE 'ELANA%'
                             THEN ISNULL(r.AGAIN_R, '') ELSE '' END)
                            + '|' +
                            (CASE WHEN
                    r.AGAIN_L IS NOT NULL AND RTRIM(r.AGAIN_L) <> ''
                    AND r.AGAIN_L NOT LIKE 'Irrigation%'
                    AND r.AGAIN_L NOT LIKE 'repo%'
                    AND r.AGAIN_L NOT LIKE '%reposition%'
                    AND r.AGAIN_L NOT LIKE 'Clareon%'
                    AND r.AGAIN_L NOT LIKE 'T-Clareon%'
                    AND r.AGAIN_L NOT LIKE 'Tecnis%'
                    AND r.AGAIN_L NOT LIKE 'LAL%'
                    AND r.AGAIN_L NOT LIKE 'ELANA%'
                             THEN ISNULL(r.AGAIN_L, '') ELSE '' END) AS qt
                        FROM RE_OPERATION r WITH(NOLOCK)
                        LEFT JOIN CUSTOM cu WITH(NOLOCK) ON cu.CUST_NUM = r.CUST_NUM
                        WHERE r.REOP_DATE >= :from AND r.REOP_DATE <= :to
                          AND NOT (
                              ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                              OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
                          )
                    ) y
                    WHERE REPLACE(y.qt, '|', '') <> ''
                ) x
                GROUP BY x.dt
                ORDER BY x.dt
