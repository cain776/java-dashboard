            SELECT t.yr, t.mo, SUM(t.cnt) AS cnt
            FROM (
                SELECT CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT) AS yr,
                       CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT) AS mo,
                       COUNT(*) AS cnt
                FROM EXAM e WITH(NOLOCK)
                WHERE e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
                GROUP BY CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT),
                         CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT)
                UNION ALL
                SELECT CAST(SUBSTRING(ce.EXAM_DATE, 1, 4) AS INT) AS yr,
                       CAST(SUBSTRING(ce.EXAM_DATE, 6, 2) AS INT) AS mo,
                       COUNT(*) AS cnt
                FROM Cataract_Exam ce WITH(NOLOCK)
                WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to
                GROUP BY CAST(SUBSTRING(ce.EXAM_DATE, 1, 4) AS INT),
                         CAST(SUBSTRING(ce.EXAM_DATE, 6, 2) AS INT)
            ) t
            GROUP BY t.yr, t.mo
            ORDER BY t.yr, t.mo
