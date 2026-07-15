            -- 검사 중단(EXAM.STOP_YN='Y') 건을 정형 중단사유 코드(EXAM.CANCEL_CD)로 분류한 월별 사유별 건수.
            -- 코드 마스터: CANCEL_CFG(CANCEL_CD → CANCEL_REASON). 상담사가 드롭다운으로 직접 고른 코드라
            -- 골든/PDF(중단사유 차트)와 정합. (구: EXAM_MEMO 자유텍스트 키워드 LIKE 추정 → 수술권유X 과소·기타 과다로 부정확.)
            --   코드군: 1xx(검사 중단) / 3xx(동일 라벨 세트) 둘 다 매핑.
            --   recommendX=121·305(불가_수술권유x) / visionChange=111·302(불가_시력변화) / glaucoma=114·303(불가_녹내장)
            --   lensImpossible=122·306·399(불가_렌즈삽입불가) / keratoconus=124·125·308·309(불가_원추각막·의심)
            --   avellino=126·310(불가_아벨리노각막이영양증) / other=그 외(107 전안부재검·199 기타/메모·코드없음 등)
            -- ★ 분류 규칙은 아래 CASE 문 한 곳뿐. 코드 재매핑은 여기만 고치면 되고 DTO·프론트는 불변.
            --   사유 항목 추가/삭제(버킷 자체 변경)는 DTO·서비스·zod·차트 2벌·CSV까지 7곳 — docs/기획/중단사유-분류-정의.md 참조.
            -- ⚠️ other는 잔차다. 미매핑·빈 코드는 조용히 other로 떨어져 에러 없이 기타만 부푼다(운영에 새 CANCEL_CD가 생겨도 티가 안 남).
            --   골든 대조에서 기타가 과다하면 CANCEL_CD 원본 분포부터 확인할 것(검증쿼리는 위 문서).
            -- ⚠️ CANCEL_CD는 이름과 달리 취소 플래그가 아니라 중단사유 코드. 단, 다른 쿼리는 같은 컬럼을 취소 판정에
            --   쓴다(지표정의 §검사수 제외조건의 ISNULL(e.CANCEL_CD,'')=''). 같은 컬럼 두 용도이니 한쪽만 보고 고치지 말 것.
            -- READ-ONLY — SELECT만 실행. 날짜 컬럼은 char(10) 'YYYY-MM-DD'.
            SELECT t.yr, t.mo,
                   SUM(CASE WHEN t.cat = 'recommendX'     THEN 1 ELSE 0 END) AS recommendX,
                   SUM(CASE WHEN t.cat = 'lensImpossible' THEN 1 ELSE 0 END) AS lensImpossible,
                   SUM(CASE WHEN t.cat = 'keratoconus'    THEN 1 ELSE 0 END) AS keratoconus,
                   SUM(CASE WHEN t.cat = 'avellino'       THEN 1 ELSE 0 END) AS avellino,
                   SUM(CASE WHEN t.cat = 'glaucoma'       THEN 1 ELSE 0 END) AS glaucoma,
                   SUM(CASE WHEN t.cat = 'visionChange'   THEN 1 ELSE 0 END) AS visionChange,
                   SUM(CASE WHEN t.cat = 'other'          THEN 1 ELSE 0 END) AS other
            FROM (
                SELECT CAST(SUBSTRING(e.EXAM_DATE, 1, 4) AS INT) AS yr,
                       CAST(SUBSTRING(e.EXAM_DATE, 6, 2) AS INT) AS mo,
                       CASE LTRIM(RTRIM(ISNULL(e.CANCEL_CD, '')))
                           WHEN '121' THEN 'recommendX'
                           WHEN '305' THEN 'recommendX'
                           WHEN '111' THEN 'visionChange'
                           WHEN '302' THEN 'visionChange'
                           WHEN '114' THEN 'glaucoma'
                           WHEN '303' THEN 'glaucoma'
                           WHEN '122' THEN 'lensImpossible'
                           WHEN '306' THEN 'lensImpossible'
                           WHEN '399' THEN 'lensImpossible'
                           WHEN '124' THEN 'keratoconus'
                           WHEN '125' THEN 'keratoconus'
                           WHEN '308' THEN 'keratoconus'
                           WHEN '309' THEN 'keratoconus'
                           WHEN '126' THEN 'avellino'
                           WHEN '310' THEN 'avellino'
                           ELSE 'other'
                       END AS cat
                FROM EXAM e WITH(NOLOCK)
                WHERE e.STOP_YN = 'Y'
                  AND e.EXAM_DATE >= :from AND e.EXAM_DATE <= :to
            ) t
            GROUP BY t.yr, t.mo
            ORDER BY t.yr, t.mo
