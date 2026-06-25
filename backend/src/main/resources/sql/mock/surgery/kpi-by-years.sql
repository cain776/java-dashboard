SELECT year,
       SUM(lasek + lasik + smile + smile_pro) AS refractive,
       SUM(icl + t_icl + kpl + t_kpl + viva) AS lens,
       SUM(cat_multi + cat_mono + cat_edof) AS cataract,
       SUM(lasek + lasik + smile + smile_pro + icl + t_icl + kpl + t_kpl + viva + cat_multi + cat_mono + cat_edof) AS total
FROM surgery_monthly
WHERE year >= :min AND year <= :max
GROUP BY year
ORDER BY year
