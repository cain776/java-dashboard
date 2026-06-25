SELECT year,
       month,
       surgery,
       outpatient,
       dreamlens,
       (surgery + outpatient + dreamlens) AS total
FROM reservation_monthly
WHERE year >= :minYear AND year <= :maxYear
ORDER BY year, month
