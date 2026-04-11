import type { LucideIcon } from 'lucide-react'
import {
  Home, CalendarCheck, Stethoscope, Syringe,
  Megaphone, Ban, BadgeDollarSign, MoreHorizontal,
} from 'lucide-react'

export interface MenuLink {
  label: string
  href: string
}

export interface MenuItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  children?: MenuLink[]
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
    'intake-conversion',
    '유입(검사예약)',
    '/stats/intake-conversion',
    'intake',
    '검사&예약',
    '인콜·아웃콜·카카오톡·네이버·홈페이지 채널별 검사예약 전환을 확인하는 화면입니다.',
    '/api/stats/intake-conversion'
  ),
  statsPage(
    'reservation',
    '예약 건수',
    '/stats/reservation',
    'intake',
    '검사&예약',
    '예약 유입 규모와 일자별 변화 추이를 확인하는 화면입니다.',
    '/api/stats/reservation'
  ),
  statsPage(
    'examination',
    '검사 건수',
    '/stats/examination',
    'intake',
    '검사&예약',
    '시력교정, 백내장, 드림렌즈, 외래 등 실제 실시 검사 건수를 확인하는 화면입니다.',
    '/api/stats/examination'
  ),
  statsPage(
    'consultation-rate',
    '상담 전환율',
    '/stats/consultation-rate',
    'consultation',
    '상담 건수',
    '시력교정 상담 전환율, 시력교정 수술 전환율, 백내장 수술 전환율을 함께 확인하는 화면입니다.',
    '/api/stats/consultation-rate'
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

const link = (id: string): MenuLink => {
  const page = findPage(id)
  return { label: page.label, href: page.path }
}

export const menuItems: MenuItem[] = [
  { id: 'home', label: 'HOME', href: '/', icon: Home },
  {
    id: 'intake',
    label: '검사&예약',
    href: '#',
    icon: CalendarCheck,
    children: [link('intake-conversion'), link('reservation'), link('examination')],
  },
  {
    id: 'consultation',
    label: '상담 건수',
    href: '#',
    icon: Stethoscope,
    children: [link('consultation-rate')],
  },
  {
    id: 'surgery-group',
    label: '수술',
    href: '#',
    icon: Syringe,
    children: [link('surgery'), link('surgery-ratio')],
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
  { id: 'unit-price', label: '객단가', href: findPage('unit-price').path, icon: BadgeDollarSign },
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
