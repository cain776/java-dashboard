SELECT year,
       month,
       lasek,
       lasik,
       smile,
       smile_pro AS smilePro,
       icl,
       t_icl AS tIcl,
       kpl,
       t_kpl AS tKpl,
       viva,
       cat_multi AS catMulti,
       cat_mono AS catMono,
       cat_edof AS catEdof,
       (lasek + lasik + smile + smile_pro + icl + t_icl + kpl + t_kpl + viva + cat_multi + cat_mono + cat_edof) AS total
FROM surgery_monthly
WHERE year >= :min AND year <= :max
ORDER BY year, month
