import type { LucideIcon } from 'lucide-react'
import {
  Home, Table2, CalendarCheck, Microscope, Stethoscope, Syringe,
  Hospital, Megaphone, Ban, BadgeDollarSign, MoreHorizontal, FileText,
} from 'lucide-react'

import { getStatsPageById } from './statsPages'

export { getStatsPageById, statsPages, type StatsPageDefinition } from './statsPages'

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
  'reservation-list': 'complete',
  'exam-list': 'complete',
  'cataract-exam-list': 'complete',
  'examination': 'complete',
  'procedure-exam': 'complete',
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
  'b2b-revenue': 'complete',
  'staff-point': 'pending',
  'prp-rate': 'pending',
  'reoperation-rate': 'pending',
  'same-day-op': 'pending',
  'designated-doctor': 'pending',
  'visit-reason': 'pending',
  'daily-reception': 'pending',
}

/** 메뉴 구현 상태 조회 (router의 운영 빌드 pending 라우트 차단 등에 사용). */
export const getMenuStatus = (id: string): MenuStatus => MENU_STATUS[id] ?? 'pending'
export const hasExplicitMenuStatus = (id: string): boolean =>
  Object.prototype.hasOwnProperty.call(MENU_STATUS, id)
export const getMenuStatusIds = (): string[] => Object.keys(MENU_STATUS)

const findPage = (id: string) => getStatsPageById(id)

const link = (id: string): MenuLink => {
  const page = findPage(id)
  return { label: page.label, href: page.path, status: getMenuStatus(id) }
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
    children: [link('intake-conversion'), link('reservation'), link('reservation-overall'), link('reservation-list')],
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
  {
    id: 'unit-price',
    label: '객단가',
    href: findPage('unit-price').path,
    icon: BadgeDollarSign,
    status: getMenuStatus('unit-price'),
  },
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
