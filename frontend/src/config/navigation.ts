import type { LucideIcon } from 'lucide-react'
import {
  Home, Table2, CalendarCheck, Microscope, Stethoscope, Syringe,
  Hospital, Megaphone, Ban, BadgeDollarSign, MoreHorizontal, FileText,
} from 'lucide-react'

export type MenuStatus = 'complete' | 'backend-only' | 'pending'

export interface MenuLink {
  label: string
  href: string
  status?: MenuStatus
}

export interface MenuItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  children?: MenuLink[]
  status?: MenuStatus
}

export interface StatsPageDefinition {
  id: string
  label: string
  path: string
  sectionId: string
  sectionLabel: string
  description: string
  apiPath: string
}

const statsPage = (
  id: string,
  label: string,
  path: string,
  sectionId: string,
  sectionLabel: string,
  description: string,
  apiPath: string
): StatsPageDefinition => ({
  id,
  label,
  path,
  sectionId,
  sectionLabel,
  description,
  apiPath,
})

export const getStatsPageById = (id: string): StatsPageDefinition => {
  const page = statsPages.find((item) => item.id === id)

  if (!page) {
    throw new Error(`Unknown stats page: ${id}`)
  }

  return page
}

export const statsPages: StatsPageDefinition[] = [
  statsPage(
    'weekly-report',
    '주간 레포트',
    '/report/weekly',
    'report-group',
    'Report',
    '한 주간의 핵심 KPI(예약·검사·수술·전환율 등)를 요약한 주간 리포트입니다.',
    '/api/report/weekly'
  ),
  statsPage(
    'monthly-report',
    '월간 레포트',
    '/report/monthly',
    'report-group',
    'Report',
    '한 달간의 핵심 KPI(예약·검사·수술·전환율 등)를 요약한 월간 리포트입니다.',
    '/api/report/monthly'
  ),
  statsPage(
    'overall-exam',
    '월별 검사자 종합지표',
    '/stats/overall-exam',
    'overall-group',
    '전체지표',
    '총검사자와 소개유형·직업 구성을 월별로 정리한 종합표입니다. 2024·2025년 확정값, 2026년부터 운영 DB 집계 예정.',
    '/api/stats/overall-exam'
  ),
  statsPage(
    'overall-exam-weekly',
    '주간 검사자 종합지표',
    '/stats/overall-exam-weekly',
    'overall-group',
    '전체지표',
    '월별 종합표와 동일한 35칼럼을 주(월~일, 월 경계 클립) 단위로 운영 DB에서 라이브 집계한 종합표입니다.',
    '/api/stats/overall-exam/weekly'
  ),
  statsPage(
    'intake-conversion',
    '유입(검사예약)',
    '/stats/intake-conversion',
    'reservation-group',
    '예약',
    '인콜·아웃콜·카카오톡·네이버·홈페이지 채널별 검사예약 전환을 확인하는 화면입니다.',
    '/api/stats/intake-conversion'
  ),
  statsPage(
    'reservation',
    '예약 건수',
    '/stats/reservation',
    'reservation-group',
    '예약',
    '예약 유입 규모와 일자별 변화 추이를 확인하는 화면입니다.',
    '/api/stats/reservation'
  ),
  statsPage(
    'reservation-overall',
    '예약 종합',
    '/stats/reservation-overall',
    'reservation-group',
    '예약',
    '콜·온라인 채널을 합산한 검사예약 종합 건수를 월별·연도별로 비교하는 화면입니다.',
    '/api/stats/reservation-overall'
  ),
  statsPage(
    'exam-list',
    '검사자 리스트',
    '/stats/exam-list',
    'exam-group',
    '검사',
    '검사일자별 검사자 상세 목록(고객·상담·수술·검안 정보)을 표 형태로 확인하는 화면입니다.',
    '/api/exam-list'
  ),
  statsPage(
    'cataract-exam-list',
    '백내장 검사자 리스트',
    '/stats/cataract-exam-list',
    'exam-group',
    '검사',
    '백내장 검사일자별 검사자 상세 목록(IOL·수술·상담 정보)을 표 형태로 확인하는 화면입니다.',
    '/api/cataract-exam-list'
  ),
  statsPage(
    'examination',
    '시술별',
    '/stats/examination',
    'exam-group',
    '검사',
    '시력교정·드림렌즈·백내장 등 시술별 검사 건수를 탭으로 나눠 확인하는 화면입니다.',
    '/api/stats/examination'
  ),
  statsPage(
    'procedure-exam',
    '검사건수',
    '/stats/procedure-exam',
    'exam-group',
    '검사',
    '시력교정·드림렌즈·백내장 검사를 합산한 전체 검사수를 월별로 비교하는 화면입니다.',
    '/api/stats/procedure-exam'
  ),
  statsPage(
    'examination-vision',
    '시력교정 검사건수',
    '/stats/examination/vision',
    'exam-group',
    '검사',
    '시력교정 검사(EXAM 실측, 사람 단위, 드림렌즈 제외) 건수를 확인하는 화면입니다.',
    '/api/stats/examination'
  ),
  statsPage(
    'examination-dreamlens',
    '드림렌즈 검사건수',
    '/stats/examination/dreamlens',
    'exam-group',
    '검사',
    '드림렌즈 검사(렌즈센터 D 기준, 사람 단위) 건수를 확인하는 화면입니다.',
    '/api/stats/examination'
  ),
  statsPage(
    'consultation-rate',
    '전환율',
    '/stats/consultation-rate',
    'consultation',
    '전환&성공률',
    '시력교정 상담 전환율, 시력교정 수술 전환율, 백내장 수술 전환율을 함께 확인하는 화면입니다.',
    '/api/stats/consultation-rate'
  ),
  statsPage(
    'cataract-reservation-rate',
    '예약률',
    '/stats/cataract-reservation-rate',
    'consultation',
    '전환&성공률',
    '백내장 검사자 대비 수술예약건 비율을 월별로 확인하는 화면입니다.',
    '/api/stats/cataract-reservation-rate'
  ),
  statsPage(
    'stop-reason',
    '중단 사유',
    '/stats/stop-reason',
    'consultation',
    '전환&성공률',
    '검사 중단(STOP_YN) 건을 사유별로 분류해 연·월별로 확인하는 화면입니다. 검사메모의 공백·약어·표기 차이를 보정한 키워드 자동분류 기준.',
    '/api/stats/stop-reason'
  ),
  statsPage(
    'surgery-list',
    '수술자 리스트',
    '/stats/surgery-list',
    'surgery',
    '수술 건수',
    '수술일자 기준 수술자 상세 목록과 보조 검사일자를 표 형태로 확인하는 화면입니다.',
    '/api/surgery-list'
  ),
  statsPage(
    'surgery',
    '수술 건수',
    '/stats/surgery',
    'surgery',
    '수술 건수',
    '수술 건수 총량과 기간별 비교를 제공하는 화면입니다.',
    '/api/stats/surgery'
  ),
  statsPage(
    'surgery-ratio',
    '주요 수술별 비중',
    '/stats/surgery-ratio',
    'surgery-ratio',
    '주요 수술별 비중',
    '주요 수술 종류별 비중과 분포를 보여주는 화면입니다.',
    '/api/stats/surgery-ratio'
  ),
  statsPage(
    'surgery-composition',
    '수술별 비중',
    '/stats/surgery-composition',
    'surgery',
    '수술',
    '시술별(라섹·라식·스마일·ICL·백내장 등) 월별 수술 건수와 그룹 내 비중을 표로 보는 화면입니다.',
    '/api/stats/surgery-ratio'
  ),
  statsPage(
    'outpatient-count',
    '외래수',
    '/stats/outpatient-count',
    'outpatient',
    '외래',
    '월별 외래수 추이를 연도별로 비교하는 화면입니다.',
    '/api/stats/outpatient-count'
  ),
  statsPage(
    'overseas',
    '해외 환자 관련 지표',
    '/stats/overseas',
    'overseas',
    '해외 환자 관련 지표',
    '해외 환자 유입, 상담, 수술 관련 핵심 지표를 모아보는 화면입니다.',
    '/api/stats/overseas'
  ),
  statsPage(
    'marketing',
    '마케팅 유입 및 효율 지표',
    '/stats/marketing',
    'marketing',
    '마케팅 유입 및 효율 지표',
    '채널별 유입과 효율을 비교하는 마케팅 통합 화면입니다.',
    '/api/stats/marketing'
  ),
  statsPage(
    'cancel-rate',
    '예약취소율',
    '/stats/cancel-rate',
    'cancel-noshow',
    '취소&부도',
    '예약 취소 비율과 취소 패턴을 확인하는 화면입니다.',
    '/api/stats/cancel-rate'
  ),
  statsPage(
    'no-show-rate',
    '부도율',
    '/stats/no-show-rate',
    'cancel-noshow',
    '취소&부도',
    '노쇼 발생 비율과 구간별 패턴을 추적하는 화면입니다.',
    '/api/stats/no-show-rate'
  ),
  statsPage(
    'unit-price',
    '객단가',
    '/stats/unit-price',
    'unit-price',
    '객단가',
    '환자당 평균 매출과 기간별 객단가 흐름을 정리하는 화면입니다.',
    '/api/stats/unit-price'
  ),
  statsPage(
    'dreamlens-revenue',
    '드림렌즈 매출',
    '/stats/dreamlens-revenue',
    'etc',
    '기타',
    '드림렌즈 매출 추이와 기간별 비교를 확인하는 화면입니다.',
    '/api/stats/dreamlens-revenue'
  ),
  statsPage(
    'b2b-revenue',
    'B2B 매출',
    '/stats/b2b-revenue',
    'etc',
    '기타',
    'B2B 채널 매출과 거래처별 실적을 확인하는 화면입니다.',
    '/api/stats/b2b-revenue'
  ),
  statsPage(
    'staff-point',
    '직원 포인트',
    '/stats/staff-point',
    'etc',
    '기타',
    '직원별 포인트 현황과 추이를 확인하는 화면입니다.',
    '/api/stats/staff-point'
  ),
  statsPage(
    'prp-rate',
    'PRP 시술율',
    '/stats/prp-rate',
    'etc',
    '기타',
    'PRP 시술 비율과 기간별 변화를 확인하는 화면입니다.',
    '/api/stats/prp-rate'
  ),
  statsPage(
    'reoperation-rate',
    '재수술율',
    '/stats/reoperation-rate',
    'etc',
    '기타',
    '재수술 발생 비율과 수술 유형별 패턴을 확인하는 화면입니다.',
    '/api/stats/reoperation-rate'
  ),
  statsPage(
    'same-day-op',
    '당일OP 비율',
    '/stats/same-day-op',
    'etc',
    '기타',
    '당일 수술 비율과 기간별 변화를 확인하는 화면입니다.',
    '/api/stats/same-day-op'
  ),
  statsPage(
    'designated-doctor',
    '지정의 수술 비율',
    '/stats/designated-doctor',
    'etc',
    '기타',
    '지정의 수술 비율과 의사별 현황을 확인하는 화면입니다.',
    '/api/stats/designated-doctor'
  ),
  statsPage(
    'visit-reason',
    '내원동기별 비중',
    '/stats/visit-reason',
    'etc',
    '기타',
    '내원동기(소개, 광고, 검색 등)별 비중과 추이를 확인하는 화면입니다.',
    '/api/stats/visit-reason'
  ),
  statsPage(
    'daily-reception',
    '일일 접수/응대 건수',
    '/stats/daily-reception',
    'etc',
    '기타',
    '일일 접수 및 응대 건수와 시간대별 분포를 확인하는 화면입니다.',
    '/api/stats/daily-reception'
  ),
]

const findPage = (id: string) => {
  return getStatsPageById(id)
}

/**
 * 메뉴별 구현 상태 맵.
 *   complete     — 백엔드 API + 프론트 페이지 모두 연결 완료 (회색 기본)
 *   backend-only — 백엔드 API만 완료, 프론트 페이지는 placeholder (주황)
 *   pending      — 백엔드·프론트 모두 미착수 (빨강)
 */
const MENU_STATUS: Record<string, MenuStatus> = {
  'weekly-report': 'complete',
  'monthly-report': 'complete',
  'overall-exam': 'complete',
  'overall-exam-weekly': 'complete',
  'intake-conversion': 'pending',
  'reservation': 'complete',
  'reservation-overall': 'complete',
  'exam-list': 'complete',
  'cataract-exam-list': 'complete',
  'examination': 'complete',
  'procedure-exam': 'complete',
  'examination-vision': 'backend-only',
  'examination-dreamlens': 'backend-only',
  'consultation-rate': 'complete',
  'cataract-reservation-rate': 'complete',
  'stop-reason': 'complete',
  'surgery-list': 'complete',
  'surgery': 'complete',
  'surgery-ratio': 'complete',
  'surgery-composition': 'complete',
  'outpatient-count': 'complete',
  'overseas': 'pending',
  'marketing': 'pending',
  'cancel-rate': 'pending',
  'no-show-rate': 'pending',
  'unit-price': 'pending',
  'dreamlens-revenue': 'pending',
  'b2b-revenue': 'pending',
  'staff-point': 'pending',
  'prp-rate': 'pending',
  'reoperation-rate': 'pending',
  'same-day-op': 'pending',
  'designated-doctor': 'pending',
  'visit-reason': 'pending',
  'daily-reception': 'pending',
}

const link = (id: string): MenuLink => {
  const page = findPage(id)
  return { label: page.label, href: page.path, status: MENU_STATUS[id] }
}

export const menuItems: MenuItem[] = [
  { id: 'home', label: 'HOME', href: '/', icon: Home },
  {
    id: 'report-group',
    label: 'Report',
    href: '#',
    icon: FileText,
    children: [link('weekly-report'), link('monthly-report')],
  },
  {
    id: 'overall-group',
    label: '전체지표',
    href: '#',
    icon: Table2,
    children: [link('overall-exam'), link('overall-exam-weekly')],
  },
  {
    id: 'reservation-group',
    label: '예약',
    href: '#',
    icon: CalendarCheck,
    children: [link('intake-conversion'), link('reservation'), link('reservation-overall')],
  },
  {
    id: 'exam-group',
    label: '검사',
    href: '#',
    icon: Microscope,
    children: [
      link('exam-list'),
      link('cataract-exam-list'),
      link('examination'),
      link('procedure-exam'),
      link('examination-vision'),
      link('examination-dreamlens'),
    ],
  },
  {
    id: 'consultation',
    label: '전환&성공률',
    href: '#',
    icon: Stethoscope,
    children: [link('consultation-rate'), link('cataract-reservation-rate'), link('stop-reason')],
  },
  {
    id: 'surgery-group',
    label: '수술',
    href: '#',
    icon: Syringe,
    children: [link('surgery-list'), link('surgery'), link('surgery-ratio'), link('surgery-composition')],
  },
  {
    id: 'outpatient',
    label: '외래',
    href: '#',
    icon: Hospital,
    children: [link('outpatient-count')],
  },
  {
    id: 'marketing-group',
    label: '마케팅',
    href: '#',
    icon: Megaphone,
    children: [link('overseas'), link('marketing')],
  },
  {
    id: 'cancel-noshow',
    label: '취소&부도',
    href: '#',
    icon: Ban,
    children: [link('cancel-rate'), link('no-show-rate')],
  },
  { id: 'unit-price', label: '객단가', href: findPage('unit-price').path, icon: BadgeDollarSign, status: MENU_STATUS['unit-price'] },
  {
    id: 'etc',
    label: '기타',
    href: '#',
    icon: MoreHorizontal,
    children: [
      link('dreamlens-revenue'), link('b2b-revenue'), link('staff-point'),
      link('prp-rate'), link('reoperation-rate'), link('same-day-op'),
      link('designated-doctor'), link('visit-reason'), link('daily-reception'),
    ],
  },
]
