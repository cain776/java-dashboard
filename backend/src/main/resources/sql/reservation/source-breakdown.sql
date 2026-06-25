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
