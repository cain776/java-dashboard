import type { FC } from 'react'
import { CancelRatePage } from './CancelRatePage'
import { NoShowRatePage } from './NoShowRatePage'

/** 취소&부도(cancel-noshow) 도메인 페이지 레지스트리 */
export const cancelNoshowPageRoutes: Record<string, FC> = {
  'cancel-rate': CancelRatePage,
  'no-show-rate': NoShowRatePage,
}
