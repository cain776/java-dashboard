SELECT COUNT(DISTINCT CONVERT(VARCHAR(23), H.InsertedDateTime, 21))
FROM HappyTalk_Counsel_List H WITH(NOLOCK)
INNER JOIN HappyTalk_Category01 C01 ON C01.Seq = H.Category01
LEFT JOIN HappyTalk_Category02 C02 ON C02.Pkey = H.Category02 AND C02.Fkey = H.Category01
WHERE H.InsertedDateTime >= :from
  AND H.InsertedDateTime < DATEADD(DAY, 1, CONVERT(datetime, :to))
  AND C01.Name = '수술전'
  AND C02.NAME = '★신환'
