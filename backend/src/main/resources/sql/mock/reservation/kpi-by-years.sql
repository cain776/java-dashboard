SELECT year,
       SUM(surgery) AS surgery,
       SUM(outpatient) AS outpatient,
       SUM(dreamlens) AS dreamlens,
       SUM(surgery + outpatient + dreamlens) AS total
FROM reservation_monthly
WHERE year >= :minYear AND year <= :maxYear
GROUP BY year
ORDER BY year
