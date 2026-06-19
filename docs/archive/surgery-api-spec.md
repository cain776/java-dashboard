# 수술 건수 API 설계서

## 대상 메뉴

```
사이드바 > 수술 > 수술 건수
라우트: /stats/surgery
페이지: frontend/src/pages/SurgeryPage.tsx
```

---

## 엔드포인트

### `GET /api/stats/surgery/monthly?years=2025,2026`

연도별 월간 수술 유형별 건수를 반환합니다.

### 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| years | int[] | O | 조회 연도 (콤마 구분, 최대 5개) |

### 응답

```json
{
  "success": true,
  "data": [
    {
      "year": 2026, "month": 3,
      "lasek": 25, "lasik": 19, "smile": 36, "smilePro": 27,
      "icl": 14, "tIcl": 9, "kpl": 4, "tKpl": 3, "viva": 6,
      "catMulti": 16, "catMono": 12, "catEdof": 9,
      "total": 180
    }
  ]
}
```

### 필드 정의

| 필드 | 타입 | 그룹 | 설명 |
| --- | --- | --- | --- |
| year | int | - | 연도 |
| month | int | - | 월 (1~12) |
| lasek | int | 시력교정 | 라섹 (T-prk, EYE CLE, FLAP PRK, PtK, M-LE) |
| lasik | int | 시력교정 | 라식 (FLAP LIFT, OPTI, iFS, VISU, fs200, Micro+, Hybrid) |
| smile | int | 시력교정 | 스마일 (SMILE, SMILE Pro 제외) |
| smilePro | int | 시력교정 | 스마일 프로 (SMILE Pro, SMILEpro) |
| icl | int | 렌즈/각막 | ICL 계열 (ICL, IPCL, ARF, ART, ARTIFLEX, GLAZE, ECHO) |
| tIcl | int | 렌즈/각막 | 토릭 ICL (T-ICL, T-IPCL, T-GLAZE, T-ECHO) |
| kpl | int | 렌즈/각막 | KPL (확인 필요) |
| tKpl | int | 렌즈/각막 | 토릭 KPL (확인 필요) |
| viva | int | 렌즈/각막 | VIVA ICL |
| catMulti | int | 백내장 | 다초점 (CTR(M), CTRmulti, 3PodF, RESTOR, T-CTR, Panoptix, symfony, Lara, LISA TRI) |
| catMono | int | 백내장 | 단초점 (CATARACT, CTR 단독, CTR+Sensa/superflex/preciz/k-flex) |
| catEdof | int | 백내장 | EDOF (EDOF, Vivity) |
| total | int | - | 전체 합계 |

---

## DB 테이블 및 SQL 구조

### 데이터 소스

| 테이블 | 용도 | 날짜 컬럼 | 수술 코드 컬럼 |
| --- | --- | --- | --- |
| OPERATIONDATA | 시력교정 + 렌즈 수술 | OPERATION_DATE | OPERATIONR, OPERATIONL |
| Cataract_Operationdata | 백내장 수술 | OPERATIONR_DATE, OPERATIONL_DATE | OPERATIONR, OPERATIONL |

### 카운팅 기준

- **눈별 개별 카운트**: 좌안(L) / 우안(R) 각각 1건으로 카운트 (UNION ALL)
- **테스트 제외**: CUST_NAME에 'TEST'/'테스트' 포함 시 제외
- **제외 수술 코드**: X, OP불가, 모든수술가능, op x, Strabismus, TEST-TEST

### 수술 코드 분류 (CASE WHEN 순서)

시력교정/렌즈 (OPERATIONDATA):
```
1. smilePro: LIKE '%SMILE Pro%' OR '%SMILEpro%' OR '%SMILE PRO%'
2. smile:    LIKE '%SMILE%'
3. viva:     LIKE '%VIVA%'
4. tIcl:     LIKE '%T-ICL%' OR '%T-IPCL%' OR '%T-GLAZE%' OR '%T-ECHO%'
5. icl:      LIKE '%ICL%' OR '%IPCL%' OR '%ARF%' OR '%ART%' OR '%ARTIFLEX%' OR '%GLAZE%' OR '%ECHO%'
6. tKpl:     LIKE '%T-KPL%'
7. kpl:      LIKE '%KPL%'
8. lasik:    LIKE '%FLAP LIFT%' OR '%OPTI%' OR '%iFS%' OR '%VISU%' OR '%fs200%' OR '%Micro+%' OR '%Hybrid%'
9. lasek:    LIKE '%T-prk%' OR '%EYE CLE%' OR '%EYE+%' OR '%FLAP PRK%' OR '%PtK%' OR '%M-LE%'
10. other:   나머지 (카운트하지 않음)
```

백내장 (Cataract_Operationdata):
```
1. catEdof:  LIKE '%EDOF%' OR '%Vivity%'
2. catMulti: LIKE '%CTR(M)%' OR '%CTRmulti%' OR '%CTR(multi)%' OR '%3PodF%' OR '%RESTOR%'
             OR '%T-CTR%' OR '%T-CATARACT%' OR '%Panoptix%' OR '%symfony%' OR '%Lara%' OR '%LISA TRI%'
3. catMono:  LIKE '%CATARACT%' OR '%CTR%' (나머지 전부)
```

> 근거: `softcrm/routes/surgery-status.js` 203~249행, `softcrm/docs/specs/surgery-status/surgery-count-standard.md`

---

## 프론트 화면 구성 (SurgeryPage.tsx)

```
KPI 카드 4장: 전체 수술건수 | 시력교정 | 렌즈/각막 | 백내장
  (기준값 + 비교값 + 증감률)

월별 모드: 수술 유형별 비교 (Grouped Bar Chart)
연도별 모드: 월별 추이 비교 (Line Chart, 그룹 토글 가능)
```

---

## 확인 필요 사항

1. **KPL / T-KPL 코드**: 프론트에 정의되어 있으나 softcrm에서 해당 코드 패턴을 찾지 못함. 실제 OPERATIONDATA에 KPL 코드가 있는지 DB 확인 필요
2. **EDOF 분류**: symfony가 다초점/EDOF 양쪽에 걸림 — 현재 catMulti로 분류. 운영팀 확인 필요
3. **중복 카운트 방지**: 현재 OPERATIONDATA와 Cataract_Operationdata를 별도 테이블로 조회. surgery-count-standard.md의 "백내장 중복입력 제거" 로직은 미적용 (1차에서는 테이블 분리로 충분)
4. **가중치**: surgery-count-standard.md에 엑스트라(×2), 컨투라/웨이브(×3) 가중치가 있으나, 대시보드 목적이므로 1차에서는 단순 건수(=1)로 카운트. 운영팀 확인 후 적용 여부 결정

---

## 구현 파일

| 레이어 | 파일 |
| --- | --- |
| DTO | `backend/.../dto/stats/SurgeryMonthlyItem.java` |
| Repository | `backend/.../repository/stats/SurgeryStatsRepository.java` |
| Service | `backend/.../service/stats/SurgeryStatsService.java` |
| Controller | `backend/.../controller/stats/SurgeryStatsController.java` |
| 프론트 API | `frontend/src/api/stats.ts` (SurgeryMonthlyItem, getSurgeryMonthly) |
| 프론트 페이지 | `frontend/src/pages/SurgeryPage.tsx` (기존, mock 데이터 사용 중) |

---

## softcrm 참고 파일

| 파일 | 내용 |
| --- | --- |
| `softcrm/routes/surgery-status.js` L203-249 | 수술 코드 → 유형 분류 CASE WHEN |
| `softcrm/docs/specs/surgery-status/surgery-count-standard.md` | 홍보용 수술수 카운트 기준 (가중치, 제외 조건) |
| `softcrm/docs/db/sql-reference/통계_주간보고.sql` L102-171 | 의사별 레이저/백내장 건수 SQL |
| `softcrm/docs/db/sql-reference/통계_상담사.sql` L267-320 | 상담사별 수술건수 SQL |
| `softcrm/docs/db/softcrm-schema.sql` L9610-9696 | OPERATIONDATA 테이블 스키마 |
| `softcrm/docs/db/softcrm-schema.sql` L2660-2820 | Cataract_Operationdata 테이블 스키마 |
