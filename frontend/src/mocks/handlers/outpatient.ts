import { http, HttpResponse } from 'msw'
import { parseYears } from './shared'

const getOutpatientCountData = (years: number[]) =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, i) => ({
      year,
      month: i + 1,
      outpatientCount: 980 + ((year + i * 37) % 260),
      total: 980 + ((year + i * 37) % 260),
    })),
  )

export const outpatientHandlers = [
  http.get('/api/stats/outpatient-count/monthly', ({ request }) =>
    HttpResponse.json({ success: true, data: getOutpatientCountData(parseYears(request)) }),
  ),
]
