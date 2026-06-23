import { z } from 'zod'
import { api } from '@/api/client'
import { withQuery } from '@/api/_shared'

/**
 * 전체 검사자 리스트 — 시력교정(EXAM) + 백내장(Cataract_Exam) 통합 행 목록.
 * 백엔드: GET /api/all-exam-list?from&to → ApiResponse<List<Map>> (camelCase 키).
 * 모집단은 월별 검사자 종합지표와 동일(EXAM ∪ Cataract, 등록 제외 없음) → 검사구분·내원동기·직업
 * 토글 조회건수가 레포트 검사유입·검사수와 정합. 전 컬럼 문자열.
 *   examGroup: 시력교정/백내장 · introType: 일반/고객소개/직원소개 · jobBucket: 직장인/학생/기타
 */
const allExamListItemSchema = z.object({
  chartNo: z.string(),
  name: z.string(),
  examDate: z.string(),
  examGroup: z.string(),
  patientType: z.string(),
  introType: z.string(),
  motiveL: z.string(),
  motiveM: z.string(),
  motiveS: z.string(),
  jobBucket: z.string(),
  job: z.string(),
  grade: z.string(),
  birth: z.string(),
  phone2: z.string(),
  phone1: z.string(),
  email: z.string(),
  counselor: z.string(),
  doctor: z.string(),
  optometrist: z.string(),
  lastVisit: z.string(),
  memo: z.string(),
})

export type AllExamListItem = z.infer<typeof allExamListItemSchema>

const allExamListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(allExamListItemSchema),
  message: z.string().nullish(),
})

export const allExamListApi = {
  getAllExamList: async (from: string, to: string): Promise<AllExamListItem[]> => {
    const res = await api.get<unknown>(withQuery('/all-exam-list', { from, to }))
    return allExamListResponseSchema.parse(res).data
  },
}
