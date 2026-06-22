import type { FC } from 'react'
import { B2BRevenuePage } from './B2BRevenuePage'

/** 기타(etc) 도메인 페이지 레지스트리 */
export const etcPageRoutes: Record<string, FC> = {
  'b2b-revenue': B2BRevenuePage,
}
