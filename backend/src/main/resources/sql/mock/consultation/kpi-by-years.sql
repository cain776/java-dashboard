SELECT year,
       ROUND(CAST(SUM(vision_surgery_booked) AS REAL) / SUM(vision_counsel_count) * 100, 1) AS overallConsultation,
       ROUND(CAST(SUM(vision_surgery_booked) AS REAL) / SUM(vision_counsel_count) * 100, 1) AS visionConsultation,
       ROUND(CAST(SUM(vision_surgery_booked) AS REAL) / SUM(vision_exam_count) * 100, 1) AS visionSurgery,
       ROUND(CAST(SUM(cataract_surgery_booked) AS REAL) / SUM(cataract_exam_count) * 100, 1) AS cataractSurgery
FROM consultation_rate_monthly
WHERE year >= :min AND year <= :max
GROUP BY year
ORDER BY year
