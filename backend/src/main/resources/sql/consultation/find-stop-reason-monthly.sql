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
