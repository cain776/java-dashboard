            SELECT yr, mo, COUNT(*) AS cnt
            FROM (
              SELECT CAST(SUBSTRING(a.RESERVE_DATE, 1, 4) AS INT) AS yr,
                     CAST(SUBSTRING(a.RESERVE_DATE, 6, 2) AS INT) AS mo,
                     a.CUST_NUM, a.RESERVE_DATE
              FROM RESERVATION a WITH(NOLOCK)
              WHERE a.RESERVE_DATE >= :from AND a.RESERVE_DATE <= :to
                AND a.RESERVE_STATE IN ('I','H')
                AND a.RESERVE_FLAG = 'H'
                AND a.RESERVE_JINRYO = '1'
              GROUP BY CAST(SUBSTRING(a.RESERVE_DATE, 1, 4) AS INT),
                       CAST(SUBSTRING(a.RESERVE_DATE, 6, 2) AS INT),
                       a.CUST_NUM, a.RESERVE_DATE
            ) t
            GROUP BY yr, mo
            ORDER BY yr, mo
