# 로컬 실행 가이드

> **배포 문서 3종 — 읽는 순서**: ① [전략·CI](deployment-strategy.md) → ② **로컬 개발 실행(이 문서)** → ③ [운영 배포](deployment-release.md)

## 개요

B&VIIT Analytics Dashboard를 개발/검증용으로 로컬 PC에서 실행하는 방법입니다.
백엔드(Spring Boot)와 프론트엔드(Vite)를 한 PC에서 각각 실행합니다.

---

## 사전 준비

| 항목 | 버전 | 확인 명령 |
| --- | --- | --- |
| Java (JDK) | 21 이상 | `java -version` |
| Node.js | 20 이상 | `node -v` |
| npm | 10 이상 | `npm -v` |

---

## 1. 프로젝트 폴더 구조

```
C:\workspace\java_dashboard\
├── backend\
│   ├── .env                 ← DB 접속정보 (git 미포함)
│   └── ...
├── frontend\
│   ├── .env                 ← 프론트 설정 (git 미포함)
│   └── ...
├── 서버시작.bat              ← 더블클릭으로 실행
└── 서버종료.bat              ← 더블클릭으로 종료
```

---

## 2. 환경변수 설정

### backend/.env

이 파일은 git에 포함되지 않습니다. 최초 1회 직접 생성해야 합니다.

```
APP_JWT_SECRET=32자-이상의-임의-시크릿
APP_SEED_ENABLED=true
APP_SEED_ADMIN_LOGIN_ID=admin
APP_SEED_ADMIN_PASSWORD=로컬-로그인-비밀번호
STATS_DB_URL=jdbc:jtds:sqlserver://220.85.109.247:1433/SOFTCRM
STATS_DB_USERNAME=계정명
STATS_DB_PASSWORD=비밀번호
```

| 변수 | 설명 |
| --- | --- |
| APP_JWT_SECRET | JWT 서명 키. 32자 이상 필수 |
| APP_SEED_ENABLED | 로컬 H2 인증 DB에 관리자 계정을 만들지 여부 |
| APP_SEED_ADMIN_LOGIN_ID | 로컬 관리자 로그인 ID |
| APP_SEED_ADMIN_PASSWORD | 로컬 관리자 비밀번호 |
| STATS_DB_URL | MSSQL 접속 주소 (SOFTCRM 데이터베이스) |
| STATS_DB_USERNAME | DB 읽기 전용 계정 |
| STATS_DB_PASSWORD | DB 비밀번호 |

> **주의**: 이 계정은 SELECT만 가능한 읽기 전용 계정을 사용하세요.
> INSERT/UPDATE/DELETE 권한이 없는 계정이 안전합니다.

### frontend/.env

별도 설정 없이 동작한다 (Vite 프록시 `/api` → 백엔드). 브라우저 목업(MSW)은 제거되어 프론트는 항상 실제 백엔드 API를 사용한다. 백엔드 포트만 바꾸려면 `VITE_BACKEND_URL`을 조정한다(서버시작.bat가 자동 설정).

---

## 3. 실행 방법

### 서버시작.bat 더블클릭

자동으로 수행되는 작업:
1. 기존 포트(18080, 15173) 프로세스 종료
2. `backend/.env` 환경변수 로드
3. 백엔드 실행 (포트 18080, mssql 프로파일)
4. 프론트엔드 개발 서버 실행 (포트 15173)

### 접속

- 대시보드: http://localhost:15173
- 로그인 계정: `APP_SEED_ADMIN_LOGIN_ID / APP_SEED_ADMIN_PASSWORD`

> 이 방식은 운영 배포용이 아니라 개발/검증용 실행 흐름입니다.

### 종료

서버종료.bat 더블클릭 또는 Ctrl+C

---

## 4. PC 부팅 시 자동 실행 (선택)

Windows 시작 프로그램에 등록하려면:

1. `Win + R` → `shell:startup` 입력
2. 열린 폴더에 `서버시작.bat`의 바로가기 생성

---

## 5. 문제 해결

### "데이터를 불러오지 못했습니다" 에러

- `backend/.env` 파일이 존재하는지 확인
- DB 접속정보가 맞는지 확인
- MSSQL 서버(220.85.109.247)에 네트워크 접근 가능한지 확인
- 방화벽에서 1433 포트가 열려있는지 확인

### 포트 충돌

```
netstat -aon | findstr :18080
netstat -aon | findstr :15173
```

이미 사용 중인 포트가 있으면 서버종료.bat으로 정리 후 재시작

### 로그인 안 됨

- `APP_SEED_ENABLED=true`인지 확인
- `APP_SEED_ADMIN_PASSWORD`가 비어 있지 않은지 확인
- 최초 실행 시 H2 인메모리 DB에 로컬 관리자 계정이 자동 생성됩니다
- 백엔드가 완전히 뜰 때까지 10~15초 대기 후 로그인 시도

### 백엔드만 재시작

```bash
cd C:\workspace\java_dashboard\backend
set STATS_DB_URL=jdbc:jtds:sqlserver://220.85.109.247:1433/SOFTCRM
set STATS_DB_USERNAME=계정명
set STATS_DB_PASSWORD=비밀번호
gradlew.bat bootRun --args="--spring.profiles.active=mssql"
```

---

## 6. 보안 주의사항

- `backend/.env` 파일을 다른 사람에게 공유하지 마세요
- `.env` 파일은 git에 커밋되지 않습니다 (`.gitignore` 설정됨)
- 운영/외부 노출 환경에서는 `APP_SEED_ENABLED=false`를 사용하고, `APP_JWT_SECRET`은 환경별로 다른 임의 문자열을 사용하세요
- DB 계정은 읽기 전용(SELECT만)을 사용하세요
- 외부 네트워크에서 접근 시 방화벽 설정을 확인하세요

---

## 7. 포트 정리

| 서비스 | 포트 | 용도 |
| --- | --- | --- |
| Backend (Spring Boot) | 18080 | REST API |
| Frontend (Vite) | 15173 | 웹 UI |
| MSSQL (운영 DB) | 1433 | 통계 데이터 조회 (READ ONLY) |
| H2 (내장 DB) | - | 인증/사용자 관리 (인메모리) |
