import { http, HttpResponse, delay } from 'msw'
import { CATARACT_EXAM_LIST_MOCK } from '../cataractExamListData'
import { EXAM_LIST_MOCK } from '../examListData'
import { parseYears } from './shared'

const getExaminationMonthlyData = (years: number[]) =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, index) => {
      const month = index + 1
      const visionCorrection = 360 + ((year + month * 17) % 110)
      const dreamlens = 45 + ((year + month * 5) % 35)
      const cataract = 80 + ((year + month * 7) % 45)
      return {
        year,
        month,
        visionCorrection,
        dreamlens,
        cataract,
        examTotal: visionCorrection + dreamlens + cataract,
        total: visionCorrection + dreamlens + cataract,
      }
    }),
  )

const getProcedureExamMonthlyData = (years: number[]) =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, index) => {
      const month = index + 1
      const examCount = 420 + ((year + month * 19) % 140)
      const oneDayExamCount = Math.round(examCount * (0.18 + (month % 4) * 0.015))
      return {
        year,
        month,
        examCount,
        oneDayExamCount,
        total: examCount,
      }
    }),
  )

const examinationMonthly = ({ request }: { request: Request }) =>
  HttpResponse.json({ success: true, data: getExaminationMonthlyData(parseYears(request)) })

export const examHandlers = [
  http.get('/api/stats/examination/monthly', examinationMonthly),
  http.get('/api/stats/examination/kpi', examinationMonthly),
  http.get('/api/stats/examination/trend', examinationMonthly),
  http.get('/api/stats/examination/composition', examinationMonthly),

  http.get('/api/stats/procedure-exam/monthly', ({ request }) =>
    HttpResponse.json({ success: true, data: getProcedureExamMonthlyData(parseYears(request)) }),
  ),

  http.get('/api/exam-list', async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const from = url.searchParams.get('from') ?? '2026-04-01'
    const to = url.searchParams.get('to') ?? '2026-04-30'
    const data = EXAM_LIST_MOCK.filter((row) => row.examDate >= from && row.examDate <= to)
    return HttpResponse.json({ success: true, data })
  }),

  http.get('/api/cataract-exam-list', async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const from = url.searchParams.get('from') ?? '2026-04-01'
    const to = url.searchParams.get('to') ?? '2026-04-30'
    const data = CATARACT_EXAM_LIST_MOCK.filter((row) => row.examDate >= from && row.examDate <= to)
    return HttpResponse.json({ success: true, data })
  }),
]
