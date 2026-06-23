import { http, HttpResponse } from 'msw'
import { parseYears } from './shared'

const getOverallExamWeeklyData = (years: number[]) =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, monthIndex) =>
      Array.from({ length: 4 }, (_, weekIndex) => {
        const month = monthIndex + 1
        const week = weekIndex + 1
        const totalExam = 72 + ((year + month * 11 + week * 7) % 48)
        const cataractTotal = Math.round(totalExam * 0.22)
        const visionExam = Math.round(totalExam * 0.68)
        return {
          year,
          month,
          week,
          partial: week === 4,
          startDate: `${year}-${String(month).padStart(2, '0')}-${String(weekIndex * 7 + 1).padStart(2, '0')}`,
          endDate: `${year}-${String(month).padStart(2, '0')}-${String(weekIndex * 7 + 7).padStart(2, '0')}`,
          totalExam,
          introGeneral: Math.round(totalExam * 0.38),
          introCustomer: Math.round(totalExam * 0.34),
          introStaff: Math.round(totalExam * 0.09),
          jobOffice: Math.round(totalExam * 0.42),
          jobStudent: Math.round(totalExam * 0.18),
          jobEtc: Math.round(totalExam * 0.4),
          visionBooked: Math.round(visionExam * 0.47),
          cataractTotal,
          cataractOnly: Math.round(cataractTotal * 0.72),
          cataractBooked: Math.round(cataractTotal * 0.62),
          stopCount: 3 + ((month + week) % 6),
          visionExam,
          dreamlens: Math.round(totalExam * 0.1),
          oneDay: Math.round(totalExam * 0.16),
          oneDayBooked: Math.round(totalExam * 0.08),
        }
      }),
    ).flat(),
  )

export const overallHandlers = [
  http.get('/api/stats/overall-exam/weekly', ({ request }) =>
    HttpResponse.json({ success: true, data: getOverallExamWeeklyData(parseYears(request)) }),
  ),
]
