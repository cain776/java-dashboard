SELECT year,
       month,
       vision_correction AS visionCorrection,
       dreamlens,
       0 AS cataract,
       (vision_correction + dreamlens) AS examTotal,
       (vision_correction + dreamlens) AS total
FROM examination_monthly
WHERE year >= :min AND year <= :max
ORDER BY year, month
