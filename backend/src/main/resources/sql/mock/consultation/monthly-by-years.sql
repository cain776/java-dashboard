SELECT year, month,
       vision_exam_count AS visionExamCount,
       vision_counsel_count AS visionCounselCount,
       vision_surgery_booked AS visionSurgeryBooked,
       vision_actual_surgery AS visionActualSurgery,
       ROUND(CAST(vision_surgery_booked AS REAL) / vision_exam_count * 100, 1) AS visionSurgeryRate,
       ROUND(CAST(vision_surgery_booked AS REAL) / vision_counsel_count * 100, 1) AS visionCounselRate,
       cataract_exam_count AS cataractExamCount,
       cataract_surgery_booked AS cataractSurgeryBooked,
       cataract_stopped_count AS cataractStoppedCount,
       ROUND(CAST(cataract_surgery_booked AS REAL) / cataract_exam_count * 100, 1) AS cataractSurgeryRate
FROM consultation_rate_monthly
WHERE year >= :min AND year <= :max
ORDER BY year, month
