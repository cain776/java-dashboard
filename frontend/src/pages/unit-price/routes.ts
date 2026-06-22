import type { FC } from 'react'
import { UnitPricePage } from './UnitPricePage'

/** 객단가(unit-price) 도메인 페이지 레지스트리 */
export const unitPricePageRoutes: Record<string, FC> = {
  'unit-price': UnitPricePage,
}
