SELECT year,
       SUM(vision_correction) AS visionCorrection,
       SUM(dreamlens) AS dreamlens,
       0 AS cataract,
       SUM(vision_correction + dreamlens) AS examTotal,
       SUM(vision_correction + dreamlens) AS total
FROM examination_monthly
WHERE year >= :min AND year <= :max
GROUP BY year
ORDER BY year
