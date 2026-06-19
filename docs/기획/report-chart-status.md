# 월간/주간 레포트 차트 — 구현 현황 (28종)

> 대상 화면: `/report/weekly`, `/report/monthly` ([ReportPage.tsx](../../frontend/src/pages/ReportPage.tsx))
> 원본: `◆월간보고◆_2026년_4월.pdf` (수기 엑셀 월간보고, 28개 도표)
> 작성 기준일: 2026-06-19 · 브랜치: `feature-fix`
> 목적: 월간보고 28개 도표를 **우리 대시보드 API 기준**으로 ① 완료됨 ② 비교함 ③ 미완성 으로 분류.
> 갱신(2026-06-19): **`overall-exam/weekly` 라이브 API 추가** — 소개유형·직업·중단·원데이/일반검사 분모분자를 운영 DB에서 일자별로 집계(월 합산 시 월값 재현). 검사유입·세그먼트 비율 도표의 데이터 근거가 생겨 🟥 9종 → 🟥 1종으로 감소.

## 상태 정의

| 상태 | 의미 |
|------|------|
| ✅ **완료됨** | 운영 DB 연동 API가 있어 차트를 **그대로 재현 가능** (이미 라이브) |
| 🟡 **비교함** | 일부 데이터는 API에 있으나 **파생계산·API결합·정의확인**이 필요 (부분) |
| 🟥 **미완성** | 차트용 API 없음 — **신규 백엔드 필요** (현재는 표 하드코딩 or 없음) |

## 집계

| 상태 | 개수 | 비율 |
|------|:---:|:---:|
| ✅ 완료됨 | 17 | 61% |
| 🟡 비교함 | 10 | 36% |
| 🟥 미완성 | 1 | 4% |
| **합계** | **28** | 100% |

> 직전(`overall-exam/weekly` 추가 전): ✅14 / 🟡4 / 🟥10.

---

## 전체 도표 (월간보고 순서)

| # | 도표명 | 그룹 | 상태 | 데이터 근거 / 필요 작업 |
|:--:|------|----|:--:|------|
| 1 | 예약 종합(콜·온라인) | 예약 | ✅ 완료됨 | `reservation-overall/monthly` → `reservations` |
| 2 | 콜 예약(인콜·아웃콜) | 예약 | ✅ 완료됨 | 동 API → `call` (인콜/아웃콜 세부는 미분리, 합계는 OK) |
| 3 | 온라인 예약(네이버·카카오·홈페이지) | 예약 | ✅ 완료됨 | 동 API → `online` (채널 세부는 미분리, 합계는 OK) |
| 4 | 일반 고객 검사(소개 제외) | 검사유입 | 🟡 비교함 | `overall-exam/weekly` → `introGeneral` (라이브). 단 우리 DB 기준이라 레거시와 차이 §6.3 |
| 5 | 고객소개 검사 | 검사유입 | 🟡 비교함 | `overall-exam/weekly` → `introCustomer` (라이브, 레거시 차이 §6.3) |
| 6 | 직원소개 검사 | 검사유입 | 🟡 비교함 | `overall-exam/weekly` → `introStaff` (라이브, 레거시 차이 §6.3) |
| 7 | 고객분류별 검사수(멀티) | 검사유입 | 🟥 미완성 | 고객/검색+광고/직원/**B2B 군인·기업** 분류 — 표에도 없음, 전부 신규 |
| 8 | 직장인 검사 | 검사유입 | ✅ 완료됨 | `overall-exam/weekly` → `jobOffice` (라이브, §1.10 prod 검증 ±0.7%p) |
| 9 | 학생 검사 | 검사유입 | ✅ 완료됨 | `overall-exam/weekly` → `jobStudent` (라이브) |
| 10 | 기타 검사(직장인·학생 제외) | 검사유입 | ✅ 완료됨 | `overall-exam/weekly` → `jobEtc` (라이브) |
| 11 | 백내장 검사수 | 검사수 | ✅ 완료됨 | `examination/monthly` → `cataract` (정의 확인 권장) |
| 12 | 시력교정 검사 | 검사수 | ✅ 완료됨 | `examination/monthly` → `visionCorrection` |
| 13 | 검사수(총검사자) | 검사수 | ✅ 완료됨 | `procedure-exam/monthly` → `examCount` (= EXAM행+Cataract세션) |
| 14 | 원데이 검사 | 검사수 | ✅ 완료됨 | `procedure-exam/monthly` → `oneDayExamCount` |
| 15 | 일반 검사 | 검사수 | 🟡 비교함 | `overall-exam/weekly` → `visionExam − oneDay` 파생 (라이브 분모분자) |
| 16 | 일반검사 비율 | 비율 | 🟡 비교함 | `overall-exam/weekly` 파생 (=`(visionExam−oneDay)÷visionExam`) (라이브) |
| 17 | 백내장 예약률 | 비율 | ✅ 완료됨 | `cataract-reservation-rate/trend?category=cataract` |
| 18 | 시력교정 예약률 | 비율 | ✅ 완료됨 | `cataract-reservation-rate/trend?category=vision` |
| 19 | 시력교정 일반예약률 | 비율 | 🟡 비교함 | `overall-exam/weekly` 파생 (=`(visionBooked−oneDayBooked)÷(visionExam−oneDay)`) (라이브) |
| 20 | 원데이 예약률 | 비율 | 🟡 비교함 | `overall-exam/weekly` 파생 (=`oneDayBooked÷oneDay`) (라이브) |
| 21 | 시력교정 상담성공률(전체·원데이·일반) | 비율 | 🟡 비교함 | `consultation-rate`에 전체율 有 / 원데이·일반 분리는 `overall-exam/weekly` 성공률(`33·34`)로 보강 가능 |
| 22 | 중단율 | 중단 | 🟡 비교함 | `overall-exam/weekly` → `stopCount ÷ visionExam` (단일 API, 라이브) |
| 23 | 중단 사유(막대) | 중단 | ✅ 완료됨 | `stop-reason/monthly` (사유 7종) |
| 24 | 백내장 수술 | 수술 | ✅ 완료됨 | `surgery/monthly` → 백내장 합 / `cataractPatients` |
| 25 | 시력교정 수술 | 수술 | ✅ 완료됨 | `surgery/monthly` → 시력교정 합 / `visionPatients` |
| 26 | 총 수술수 | 수술 | ✅ 완료됨 | `surgery/monthly` → `total` |
| 27 | 시력교정수술 상세표 | 수술 | 🟡 비교함 | 주요 수술종류는 有 / **재수술(엑스트라·다초점)·백내장 세부**는 미분리 |
| 28 | 외래수 | 외래 | ✅ 완료됨 | `outpatient-count/monthly` → `outpatientCount` |

---

## ① ✅ 완료됨 (17) — 바로 차트 연결

> 기존 hook 재사용 → 레포트 카드 와이어링만 하면 됨.

- 예약 종합 / 콜 예약 / 온라인 예약  *(`reservation-overall`)*
- 백내장 검사수 / 시력교정 검사 / 검사수(총) *(`examination`, `procedure-exam`)*
- 원데이 검사 *(`procedure-exam`)*
- **직장인 검사 / 학생 검사 / 기타 검사** *(`overall-exam/weekly` → `jobOffice/Student/Etc`, §1.10 prod 검증)*
- 백내장 예약률 / 시력교정 예약률 *(`cataract-reservation-rate`)*
- 중단 사유 *(`stop-reason`)*
- 백내장 수술 / 시력교정 수술 / 총 수술수 *(`surgery/monthly`)*
- 외래수 *(`outpatient-count`)*

## ② 🟡 비교함 (10) — 기존 API + 파생/결합/검증

> `overall-exam/weekly`는 일자별 라이브이므로 월 합산하면 월간 차트값을 재현한다.

- **소개유형 3종(일반/고객소개/직원소개)** — `overall-exam/weekly`의 `introGeneral/Customer/Staff`로 라이브 제공. 단 우리 DB 기준(고객소개=`소개고객`)이라 레거시 월간보고와 차이 있음(§6.3) — 정의 합의 필요.
- **일반 검사** — `overall-exam/weekly`의 `visionExam − oneDay` 파생(라이브 분모분자).
- **일반검사 비율 / 시력교정 일반예약률 / 원데이 예약률** — `overall-exam/weekly` 칼럼(`30·32·33·34` 산식)으로 파생(라이브). 전용 trend 필드로 승격 가능.
- **중단율** — `overall-exam/weekly`의 `stopCount ÷ visionExam` (단일 API 내 파생).
- **시력교정 상담성공률** — 전체 성공률은 `consultation-rate`에 有. 원데이·일반 세그먼트 성공률은 `overall-exam/weekly` 성공률(`33·34`)로 보강.
- **시력교정수술 상세표** — `surgery/monthly`로 주요 종류 커버. 재수술(엑스트라/다초점)·백내장 세부(퍼스널/콘트라/웨이브) 분류는 검증·확장 필요.

## ③ 🟥 미완성 (1) — 신규 백엔드 필요

### 고객분류별 검사수(멀티) — 7번 도표
- 고객/검색+광고/직원/**B2B 군인·기업** 분류. 현재 표에도 없는 신규 분류라 분류 정의부터 필요.
- `overall-exam/weekly`의 소개유형(소개고객/소개직원/일반)과 축이 달라 그대로 매핑 불가 — B2B(군인·기업) 식별 규칙을 별도로 정의해야 함.

---

## 주의 (데이터 신뢰성)

- **EXAM·Cataract_Exam은 고객당 1행 덮어쓰기 스냅샷** → 과거월 수치 사후 변동 (지표정의 §1.9.1.1, 메모 `exam-overwrite-stop-yn`). 레포트는 **마감 스냅샷** 적용 필요(기획 커밋 `5f92ca1`).
- **예약 콜·온라인**은 콜센터 MySQL·등록일 다중소스라 MSSQL 단독 재현 불가 → **2026값은 추정 라이브** (지표정의 §5.1, 메모 `reservation-overall-not-reproducible`).
