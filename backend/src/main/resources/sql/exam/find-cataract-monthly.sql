            SELECT CAST(SUBSTRING(ce.EXAM_DATE, 1, 4) AS INT) AS yr,
                   CAST(SUBSTRING(ce.EXAM_DATE, 6, 2) AS INT) AS mo,
                   SUM(CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONR, ''))), '') IS NOT NULL THEN 1 ELSE 0 END)
                 + SUM(CASE WHEN NULLIF(LTRIM(RTRIM(ISNULL(ce.OPERATIONL, ''))), '') IS NOT NULL THEN 1 ELSE 0 END) AS cnt
            FROM Cataract_Exam ce WITH(NOLOCK)
            JOIN CUSTOM cu WITH(NOLOCK) ON ce.CUST_NUM = cu.CUST_NUM
            WHERE ce.EXAM_DATE >= :from AND ce.EXAM_DATE <= :to
              AND (ce.Stop_YN IS NULL OR ce.Stop_YN <> 'Y')
              AND (ce.Cancel_CD IS NULL OR LTRIM(RTRIM(ce.Cancel_CD)) = '')
              AND NOT (
                ISNULL(cu.CUST_NAME, '') LIKE N'%테스트%'
                OR LOWER(ISNULL(cu.CUST_NAME, '')) LIKE '%test%'
              )
              AND EXISTS (
                SELECT 1
                FROM RESERVATION r WITH(NOLOCK)
                WHERE r.CUST_NUM = ce.CUST_NUM
                  AND r.RESERVE_DATE = ce.EXAM_DATE
                  AND r.RESERVE_STATE IN ('I','H')
                  AND r.RESERVE_FLAG = 'H'
              )
            GROUP BY CAST(SUBSTRING(ce.EXAM_DATE, 1, 4) AS INT), CAST(SUBSTRING(ce.EXAM_DATE, 6, 2) AS INT)
            ORDER BY yr, mo
