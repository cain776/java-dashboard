            SELECT CAST(SUBSTRING(r.RESERVE_DATE, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(r.RESERVE_DATE, 6, 2) AS INT) AS mo,
                   COUNT(*) AS cnt
            FROM RESERVATION r WITH(NOLOCK)
            WHERE r.RESERVE_DATE >= :from AND r.RESERVE_DATE <= :to
              AND r.RESERVE_FLAG = 'F'
              AND r.RESERVE_STATE IN ('I','H')
            GROUP BY CAST(SUBSTRING(r.RESERVE_DATE, 1, 4) AS INT),
                     CAST(SUBSTRING(r.RESERVE_DATE, 6, 2) AS INT)
            ORDER BY yr, mo
