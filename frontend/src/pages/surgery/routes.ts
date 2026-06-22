import type { FC } from 'react'
import { SurgeryListPage } from './SurgeryListPage'
import { SurgeryPage } from './SurgeryPage'
import { SurgeryRatioPage } from './SurgeryRatioPage'
import { SurgeryCompositionPage } from './SurgeryCompositionPage'

/** 수술(surgery) 도메인 페이지 레지스트리 */
export const surgeryPageRoutes: Record<string, FC> = {
  'surgery-list': SurgeryListPage,
  'surgery': SurgeryPage,
  'surgery-ratio': SurgeryRatioPage,
  'surgery-composition': SurgeryCompositionPage,
}
