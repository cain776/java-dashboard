import { http, HttpResponse, delay } from 'msw'
import { createDateRange, formatDate, parseYears } from './shared'

const sourceLabelMap = {
  phone: '전화',
  naver: '네이버',
  kakao: '카카오',
  walkIn: '워크인',
  referral: '지인소개',
} as const

const RESERVATION_MONTHLY: Record<number, { surgery: number; outpatient: number; dreamlens: number }[]> = {
  2024: [
    { surgery: 32, outpatient: 280, dreamlens: 28 }, { surgery: 36, outpatient: 295, dreamlens: 30 },
    { surgery: 38, outpatient: 305, dreamlens: 32 }, { surgery: 42, outpatient: 320, dreamlens: 35 },
    { surgery: 40, outpatient: 315, dreamlens: 33 }, { surgery: 45, outpatient: 335, dreamlens: 38 },
    { surgery: 50, outpatient: 355, dreamlens: 40 }, { surgery: 48, outpatient: 348, dreamlens: 38 },
    { surgery: 52, outpatient: 365, dreamlens: 42 }, { surgery: 55, outpatient: 375, dreamlens: 44 },
    { surgery: 53, outpatient: 370, dreamlens: 42 }, { surgery: 58, outpatient: 385, dreamlens: 46 },
  ],
  2025: [
    { surgery: 38, outpatient: 310, dreamlens: 32 }, { surgery: 42, outpatient: 325, dreamlens: 35 },
    { surgery: 45, outpatient: 340, dreamlens: 38 }, { surgery: 50, outpatient: 355, dreamlens: 40 },
    { surgery: 48, outpatient: 348, dreamlens: 37 }, { surgery: 55, outpatient: 370, dreamlens: 42 },
    { surgery: 60, outpatient: 390, dreamlens: 45 }, { surgery: 58, outpatient: 385, dreamlens: 43 },
    { surgery: 62, outpatient: 400, dreamlens: 48 }, { surgery: 65, outpatient: 410, dreamlens: 50 },
    { surgery: 63, outpatient: 405, dreamlens: 47 }, { surgery: 68, outpatient: 420, dreamlens: 52 },
  ],
  2026: [
    { surgery: 52, outpatient: 350, dreamlens: 40 }, { surgery: 58, outpatient: 368, dreamlens: 44 },
    { surgery: 55, outpatient: 360, dreamlens: 42 }, { surgery: 65, outpatient: 384, dreamlens: 48 },
    { surgery: 62, outpatient: 378, dreamlens: 46 }, { surgery: 70, outpatient: 398, dreamlens: 50 },
    { surgery: 74, outpatient: 415, dreamlens: 54 }, { surgery: 72, outpatient: 408, dreamlens: 52 },
    { surgery: 76, outpatient: 425, dreamlens: 56 }, { surgery: 80, outpatient: 440, dreamlens: 58 },
    { surgery: 78, outpatient: 432, dreamlens: 56 }, { surgery: 82, outpatient: 450, dreamlens: 60 },
  ],
}

const getReservationMonthlyData = (years: number[]) =>
  years.flatMap((year) => {
    const months = RESERVATION_MONTHLY[year] ?? Array.from({ length: 12 }, () => ({ surgery: 0, outpatient: 0, dreamlens: 0 }))
    return months.map((m, i) => ({ year, month: i + 1, ...m, total: m.surgery + m.outpatient + m.dreamlens }))
  })

const getReservationOverallData = (years: number[]) =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, i) => {
      const online = 210 + ((year + i * 13) % 80)
      const call = 140 + ((year + i * 9) % 60)
      return {
        year,
        month: i + 1,
        reservations: online + call,
        online,
        call,
        total: online + call,
      }
    }),
  )

const getReservationListData = (from: string, to: string) => {
  const channels = [
    { channel: '인콜', channelGroup: '콜' },
    { channel: '아웃콜', channelGroup: '콜' },
    { channel: '홈페이지', channelGroup: '온라인' },
    { channel: '네이버', channelGroup: '온라인' },
  ]

  return createDateRange(from, to).flatMap((date, dateIndex) =>
    Array.from({ length: 3 }, (_, rowIndex) => {
      const channel = channels[(dateIndex + rowIndex) % channels.length]
      return {
        registeredAt: date,
        registeredTime: `${String(9 + ((dateIndex + rowIndex) % 8)).padStart(2, '0')}:00`,
        reserveDate: date,
        reserveTime: `${String(10 + ((dateIndex + rowIndex) % 7)).padStart(2, '0')}:30`,
        chartNo: `R${date.replaceAll('-', '')}${rowIndex + 1}`,
        name: `예약자${dateIndex + 1}-${rowIndex + 1}`,
        reserveState: rowIndex % 5 === 0 ? 'C' : 'Y',
        channel: channel.channel,
        channelGroup: channel.channelGroup,
        doctor: rowIndex % 2 === 0 ? '김보이' : '강은민',
        counselor: rowIndex % 2 === 0 ? '유혜진' : '양다영',
        comment: 'MSW 예약자 목업',
      }
    }),
  )
}

export const reservationHandlers = [
  http.get('/api/stats/reservation', ({ request }) => {
    const url = new URL(request.url)
    const from = url.searchParams.get('from') ?? formatDate(new Date())
    const to = url.searchParams.get('to') ?? formatDate(new Date())
    const dates = createDateRange(from, to)

    const dailyTrend = dates.map((date, index) => {
      const reservations = 18 + (index % 5) * 3 + (index % 2 === 0 ? 4 : 0)
      const examinations = Math.max(9, reservations - (4 + (index % 3)))
      const cancellations = 1 + (index % 3)

      return { date, reservations, examinations, cancellations }
    })

    const totalReservations = dailyTrend.reduce((sum, item) => sum + item.reservations, 0)
    const completedExaminations = dailyTrend.reduce((sum, item) => sum + item.examinations, 0)
    const cancellations = dailyTrend.reduce((sum, item) => sum + item.cancellations, 0)
    const walkInReservations = Math.round(totalReservations * 0.17)

    const phoneCount = Math.round(totalReservations * 0.29)
    const naverCount = Math.round(totalReservations * 0.33)
    const kakaoCount = Math.round(totalReservations * 0.14)
    const referralCount =
      totalReservations - (phoneCount + naverCount + kakaoCount + walkInReservations)

    const sourceBreakdown = [
      { source: 'phone', count: phoneCount },
      { source: 'naver', count: naverCount },
      { source: 'kakao', count: kakaoCount },
      { source: 'walkIn', count: walkInReservations },
      { source: 'referral', count: referralCount },
    ].map((item) => ({
      ...item,
      label: sourceLabelMap[item.source as keyof typeof sourceLabelMap],
    }))

    const hourlyDistribution = [
      { slot: '09:00', count: 18 },
      { slot: '10:00', count: 28 },
      { slot: '11:00', count: 34 },
      { slot: '12:00', count: 17 },
      { slot: '13:00', count: 15 },
      { slot: '14:00', count: 29 },
      { slot: '15:00', count: 31 },
      { slot: '16:00', count: 24 },
      { slot: '17:00', count: 19 },
    ]

    return HttpResponse.json({
      data: {
        summary: {
          totalReservations,
          reservationChangeRate: 12.6,
          completedExaminations,
          examinationConversionRate: Number(((completedExaminations / totalReservations) * 100).toFixed(1)),
          cancellations,
          cancellationRate: Number(((cancellations / totalReservations) * 100).toFixed(1)),
          walkInReservations,
          walkInShareRate: Number(((walkInReservations / totalReservations) * 100).toFixed(1)),
        },
        dailyTrend,
        sourceBreakdown,
        hourlyDistribution,
      },
      meta: { from, to, mock: true },
    })
  }),

  http.get('/api/stats/reservation/monthly', ({ request }) => {
    return HttpResponse.json({ success: true, data: getReservationMonthlyData(parseYears(request)) })
  }),

  http.get('/api/stats/reservation-overall/monthly', ({ request }) => {
    return HttpResponse.json({ success: true, data: getReservationOverallData(parseYears(request)) })
  }),

  http.get('/api/stats/reservation/kpi', async ({ request }) => {
    await delay(200)
    const years = parseYears(request)
    const monthly = getReservationMonthlyData(years)
    const data = years.map((year) => {
      const rows = monthly.filter((r) => r.year === year)
      return {
        year,
        surgery: rows.reduce((s, r) => s + r.surgery, 0),
        outpatient: rows.reduce((s, r) => s + r.outpatient, 0),
        dreamlens: rows.reduce((s, r) => s + r.dreamlens, 0),
        total: rows.reduce((s, r) => s + r.total, 0),
      }
    })
    return HttpResponse.json({ success: true, data })
  }),

  http.get('/api/stats/reservation/trend', async ({ request }) => {
    await delay(500)
    return HttpResponse.json({ success: true, data: getReservationMonthlyData(parseYears(request)) })
  }),

  http.get('/api/stats/reservation/composition', async ({ request }) => {
    await delay(350)
    return HttpResponse.json({ success: true, data: getReservationMonthlyData(parseYears(request)) })
  }),

  http.get('/api/reservation-list', async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const from = url.searchParams.get('from') ?? '2026-04-01'
    const to = url.searchParams.get('to') ?? '2026-04-30'
    return HttpResponse.json({ success: true, data: getReservationListData(from, to) })
  }),
]
