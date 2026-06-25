            SELECT
                YEAR(D.RESERVE_DATE) AS yr,
                MONTH(D.RESERVE_DATE) AS mo,
                COUNT(DISTINCT D.CUST_NUM) AS examCount,
                COUNT(DISTINCT CASE WHEN op.MIN_OP_RSV IS NOT NULL THEN D.CUST_NUM END) AS surgeryBookedCount,
                COUNT(DISTINCT CASE WHEN B.MY_optometrist IS NOT NULL
                                     AND B.MY_optometrist <> ''
                                     AND B.MY_COUNSELOR = 'BS0808' THEN D.CUST_NUM END) AS stoppedCount
            FROM RESERVATION D WITH(NOLOCK)
            INNER JOIN CUSTOM B WITH(NOLOCK) ON B.CUST_NUM = D.CUST_NUM
            LEFT JOIN (
                SELECT CUST_NUM, MIN(RESERVE_DATE) AS MIN_OP_RSV
                  FROM RESERVATION WITH(NOLOCK)
                 WHERE RESERVE_FLAG = 'O' AND RESERVE_JINRYO = '4' AND RESERVE_STATE <> 'C'
                 GROUP BY CUST_NUM
            ) op ON op.CUST_NUM = D.CUST_NUM
            WHERE D.RESERVE_DATE >= :from AND D.RESERVE_DATE <= :to
                AND D.RESERVE_FLAG = 'H'
                AND D.RESERVE_JINRYO <> '3'
                AND D.RESERVE_STATE <> 'C'
                AND NOT (D.RESERVE_FLAG = 'H' AND D.RESERVE_JINRYO = '1' AND D.RESERVE_SEQ = '3')
                AND D.CUST_NUM <> '9999999999999'
            GROUP BY YEAR(D.RESERVE_DATE), MONTH(D.RESERVE_DATE)
            ORDER BY YEAR(D.RESERVE_DATE), MONTH(D.RESERVE_DATE)
