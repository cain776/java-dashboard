import type { FC } from 'react'
import { OverallExamPage } from './OverallExamPage'
import { OverallExamWeeklyPage } from './OverallExamWeeklyPage'

/** 전체지표(overall) 도메인 페이지 레지스트리 */
export const overallPageRoutes: Record<string, FC> = {
  'overall-exam': OverallExamPage,
  'overall-exam-weekly': OverallExamWeeklyPage,
}
