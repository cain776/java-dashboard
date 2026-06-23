import { http, HttpResponse } from 'msw'
import { parseYears } from './shared'

export const consultationHandlers = [
  http.get('/api/stats/consultation-rate', ({ request }) => {
    const data = parseYears(request).flatMap((year) =>
      Array.from({ length: 12 }, (_, i) => {
        const visionExamCount = 250 + ((i * 7 + year) % 80)
        const visionSurgeryBooked = Math.round(visionExamCount * (0.4 + ((i % 5) * 0.03)))
        const visionActualSurgery = Math.round(visionSurgeryBooked * 0.95)
        const visionCounselCount = Math.round(visionExamCount * 0.75)
        const cataractExamCount = 80 + ((i * 3) % 30)
        const cataractSurgeryBooked = Math.round(cataractExamCount * (0.6 + ((i % 4) * 0.05)))
        const cataractStoppedCount = Math.max(0, Math.round(cataractExamCount * 0.08))
        return {
          year, month: i + 1,
          visionExamCount, visionCounselCount,
          visionSurgeryBooked, visionActualSurgery,
          visionSurgeryRate: Math.round((visionSurgeryBooked / visionExamCount) * 1000) / 10,
          visionCounselRate: Math.round((visionSurgeryBooked / visionCounselCount) * 1000) / 10,
          cataractExamCount, cataractSurgeryBooked, cataractStoppedCount,
          cataractSurgeryRate: Math.round((cataractSurgeryBooked / cataractExamCount) * 1000) / 10,
        }
      }),
    )

    return HttpResponse.json({ success: true, data })
  }),
]
