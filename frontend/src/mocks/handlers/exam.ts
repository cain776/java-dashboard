import { http, HttpResponse, delay } from 'msw'
import { CATARACT_EXAM_LIST_MOCK } from '../cataractExamListData'
import { EXAM_LIST_MOCK } from '../examListData'

export const examHandlers = [
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
