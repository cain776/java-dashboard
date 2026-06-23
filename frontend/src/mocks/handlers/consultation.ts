import { http, HttpResponse } from 'msw'
import { parseYears } from './shared'

const getConsultationRateData = (years: number[]) =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, i) => {
      const visionExamCount = 250 + ((i * 7 + year) % 80)
      const visionSurgeryBooked = Math.round(visionExamCount * (0.4 + ((i % 5) * 0.03)))
      const visionActualSurgery = Math.round(visionSurgeryBooked * 0.95)
      const visionCounselCount = Math.round(visionExamCount * 0.75)
      const cataractExamCount = 80 + ((i * 3) % 30)
      const cataractSurgeryBooked = Math.round(cataractExamCount * (0.6 + ((i % 4) * 0.05)))
      const cataractStoppedCount = Math.max(0, Math.round(cataractExamCount * 0.08))
      return {
        year,
        month: i + 1,
        visionExamCount,
        visionCounselCount,
        visionSurgeryBooked,
        visionActualSurgery,
        visionSurgeryRate: Math.round((visionSurgeryBooked / visionExamCount) * 1000) / 10,
        visionCounselRate: Math.round((visionSurgeryBooked / visionCounselCount) * 1000) / 10,
        visionCounselRateOneday: 74 + (i % 5),
        visionCounselRateGeneral: 61 + (i % 7),
        visionGeneralBookRate: 38 + (i % 6),
        cataractExamCount,
        cataractSurgeryBooked,
        cataractStoppedCount,
        cataractSurgeryRate: Math.round((cataractSurgeryBooked / cataractExamCount) * 1000) / 10,
      }
    }),
  )

const getStopReasonData = (years: number[]) =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, i) => {
      const recommendX = 6 + (i % 4)
      const lensImpossible = 4 + ((year + i) % 3)
      const keratoconus = 2 + (i % 2)
      const avellino = 1 + (i % 2)
      const glaucoma = 2 + ((i + 1) % 3)
      const visionChange = 3 + (i % 4)
      const other = 5 + ((year + i * 2) % 4)
      return {
        year,
        month: i + 1,
        recommendX,
        lensImpossible,
        keratoconus,
        avellino,
        glaucoma,
        visionChange,
        other,
        total: recommendX + lensImpossible + keratoconus + avellino + glaucoma + visionChange + other,
      }
    }),
  )

const getCataractReservationRateData = (years: number[]) =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, i) => {
      const examCount = 90 + ((year + i * 9) % 50)
      const surgeryBookedCount = Math.round(examCount * (0.58 + (i % 5) * 0.025))
      return {
        year,
        month: i + 1,
        examCount,
        surgeryBookedCount,
        reservationRate: Math.round((surgeryBookedCount / examCount) * 1000) / 10,
      }
    }),
  )

const consultationRate = ({ request }: { request: Request }) =>
  HttpResponse.json({ success: true, data: getConsultationRateData(parseYears(request)) })

export const consultationHandlers = [
  http.get('/api/stats/consultation-rate', consultationRate),
  http.get('/api/stats/consultation-rate/kpi', consultationRate),
  http.get('/api/stats/consultation-rate/trend', consultationRate),
  http.get('/api/stats/consultation-rate/composition', consultationRate),
  http.get('/api/stats/stop-reason/monthly', ({ request }) =>
    HttpResponse.json({ success: true, data: getStopReasonData(parseYears(request)) }),
  ),
  http.get('/api/stats/cataract-reservation-rate/trend', ({ request }) =>
    HttpResponse.json({ success: true, data: getCataractReservationRateData(parseYears(request)) }),
  ),
]
