import { http, HttpResponse, delay } from 'msw'
import { EXAM_LIST_MOCK } from './examListData'
import { CATARACT_EXAM_LIST_MOCK } from './cataractExamListData'

const sourceLabelMap = {
  phone: '전화',
  naver: '네이버',
  kakao: '카카오',
  walkIn: '워크인',
  referral: '지인소개',
} as const

const pad = (value: number) => String(value).padStart(2, '0')

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const createDateRange = (from: string, to: string) => {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      return formatDate(date)
    })
  }

  const dates: string[] = []
  const cursor = new Date(start)

  while (cursor <= end) {
    dates.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

/* ── 예약 월별 목업 데이터 (공용) ── */
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

function parseYears(request: Request): number[] {
  const url = new URL(request.url)
  const years = (url.searchParams.get('years') ?? '').split(',').map(Number).filter(Boolean)
  if (!years.length) years.push(new Date().getFullYear())
  return years
}

function getReservationMonthlyData(years: number[]) {
  return years.flatMap((year) => {
    const months = RESERVATION_MONTHLY[year] ?? Array.from({ length: 12 }, () => ({ surgery: 0, outpatient: 0, dreamlens: 0 }))
    return months.map((m, i) => ({ year, month: i + 1, ...m, total: m.surgery + m.outpatient + m.dreamlens }))
  })
}

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { loginId: string; password: string }

    if (body.loginId && body.password) {
      const loginId = body.loginId.trim().toLowerCase()

      return HttpResponse.json({
        success: true,
        data: {
          token: 'mock-jwt-token-123',
          user: {
            id: 1,
            loginId,
            email: loginId === 'admin' ? 'admin@bviit.com' : `${loginId}@bviit.local`,
            name: loginId === 'admin' ? '관리자' : loginId,
          },
        },
      })
    }

    return HttpResponse.json({ success: false, status: 401, message: '로그인 실패' }, { status: 401 })
  }),
  http.get('/api/stats/reservation', ({ request }) => {
    const url = new URL(request.url)
    const from = url.searchParams.get('from') ?? formatDate(new Date())
    const to = url.searchParams.get('to') ?? formatDate(new Date())
    const dates = createDateRange(from, to)

    const dailyTrend = dates.map((date, index) => {
      const reservations = 18 + (index % 5) * 3 + (index % 2 === 0 ? 4 : 0)
      const examinations = Math.max(9, reservations - (4 + (index % 3)))
      const cancellations = 1 + (index % 3)

      return {
        date,
        reservations,
        examinations,
        cancellations,
      }
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
          examinationConversionRate: Number(
            ((completedExaminations / totalReservations) * 100).toFixed(1)
          ),
          cancellations,
          cancellationRate: Number(((cancellations / totalReservations) * 100).toFixed(1)),
          walkInReservations,
          walkInShareRate: Number(((walkInReservations / totalReservations) * 100).toFixed(1)),
        },
        dailyTrend,
        sourceBreakdown,
        hourlyDistribution,
      },
      meta: {
        from,
        to,
        mock: true,
      },
    })
  }),
  http.get('/api/stats/reservation/monthly', ({ request }) => {
    const url = new URL(request.url)
    const yearsParam = url.searchParams.get('years') ?? ''
    const years = yearsParam.split(',').map(Number).filter(Boolean)
    if (!years.length) years.push(new Date().getFullYear())
    const data = getReservationMonthlyData(years)
    return HttpResponse.json({ success: true, data })
  }),

  /* ── 패널별 분리 API ── */
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
    const years = parseYears(request)
    return HttpResponse.json({ success: true, data: getReservationMonthlyData(years) })
  }),

  http.get('/api/stats/reservation/composition', async ({ request }) => {
    await delay(350)
    const years = parseYears(request)
    return HttpResponse.json({ success: true, data: getReservationMonthlyData(years) })
  }),
  http.get('/api/stats/surgery/monthly', ({ request }) => {
    const url = new URL(request.url)
    const years = (url.searchParams.get('years') ?? '').split(',').map(Number).filter(Boolean)
    if (!years.length) years.push(new Date().getFullYear())

    const genSurgeryMonth = (i: number, seed: number) => {
      const base = 20 + ((i * 3 + seed) % 15)
      return {
        lasek: base + 2, lasik: base + 5, smile: base + 8, smilePro: base + 3,
        icl: Math.max(3, base - 10), tIcl: Math.max(2, base - 12), kpl: 4, tKpl: 2, viva: 3,
        catMulti: base, catMono: base + 4, catEdof: Math.max(1, base - 15),
      }
    }

    const data = years.flatMap((year) =>
      Array.from({ length: 12 }, (_, i) => {
        const m = genSurgeryMonth(i, year)
        const visionPatients = m.lasek + m.lasik + m.smile + m.smilePro + m.icl + m.tIcl + m.kpl + m.tKpl + m.viva
        const cataractPatients = m.catMulti + m.catMono + m.catEdof
        return { year, month: i + 1, ...m, visionPatients, cataractPatients, total: visionPatients + cataractPatients }
      }),
    )

    return HttpResponse.json({ success: true, data })
  }),
  http.get('/api/stats/surgery/kpi', ({ request }) => {
    const url = new URL(request.url)
    const years = (url.searchParams.get('years') ?? '').split(',').map(Number).filter(Boolean)
    if (!years.length) years.push(new Date().getFullYear())

    const genSurgeryMonth = (i: number, seed: number) => {
      const base = 20 + ((i * 3 + seed) % 15)
      return {
        lasek: base + 2, lasik: base + 5, smile: base + 8, smilePro: base + 3,
        icl: Math.max(3, base - 10), tIcl: Math.max(2, base - 12), kpl: 4, tKpl: 2, viva: 3,
        catMulti: base, catMono: base + 4, catEdof: Math.max(1, base - 15),
      }
    }

    const data = years.flatMap((year) =>
      Array.from({ length: 12 }, (_, i) => {
        const m = genSurgeryMonth(i, year)
        const visionPatients = m.lasek + m.lasik + m.smile + m.smilePro + m.icl + m.tIcl + m.kpl + m.tKpl + m.viva
        const cataractPatients = m.catMulti + m.catMono + m.catEdof
        return { year, month: i + 1, ...m, visionPatients, cataractPatients, total: visionPatients + cataractPatients }
      }),
    )

    return HttpResponse.json({ success: true, data })
  }),
  http.get('/api/stats/surgery/panel/trend', ({ request }) => {
    const url = new URL(request.url)
    const years = (url.searchParams.get('years') ?? '').split(',').map(Number).filter(Boolean)
    if (!years.length) years.push(new Date().getFullYear())

    const genSurgeryMonth = (i: number, seed: number) => {
      const base = 20 + ((i * 3 + seed) % 15)
      return {
        lasek: base + 2, lasik: base + 5, smile: base + 8, smilePro: base + 3,
        icl: Math.max(3, base - 10), tIcl: Math.max(2, base - 12), kpl: 4, tKpl: 2, viva: 3,
        catMulti: base, catMono: base + 4, catEdof: Math.max(1, base - 15),
      }
    }

    const data = years.flatMap((year) =>
      Array.from({ length: 12 }, (_, i) => {
        const m = genSurgeryMonth(i, year)
        const visionPatients = m.lasek + m.lasik + m.smile + m.smilePro + m.icl + m.tIcl + m.kpl + m.tKpl + m.viva
        const cataractPatients = m.catMulti + m.catMono + m.catEdof
        return { year, month: i + 1, ...m, visionPatients, cataractPatients, total: visionPatients + cataractPatients }
      }),
    )

    return HttpResponse.json({ success: true, data })
  }),
  http.get('/api/stats/surgery/panel/composition', ({ request }) => {
    const url = new URL(request.url)
    const years = (url.searchParams.get('years') ?? '').split(',').map(Number).filter(Boolean)
    if (!years.length) years.push(new Date().getFullYear())

    const genSurgeryMonth = (i: number, seed: number) => {
      const base = 20 + ((i * 3 + seed) % 15)
      return {
        lasek: base + 2, lasik: base + 5, smile: base + 8, smilePro: base + 3,
        icl: Math.max(3, base - 10), tIcl: Math.max(2, base - 12), kpl: 4, tKpl: 2, viva: 3,
        catMulti: base, catMono: base + 4, catEdof: Math.max(1, base - 15),
      }
    }

    const data = years.flatMap((year) =>
      Array.from({ length: 12 }, (_, i) => {
        const m = genSurgeryMonth(i, year)
        const visionPatients = m.lasek + m.lasik + m.smile + m.smilePro + m.icl + m.tIcl + m.kpl + m.tKpl + m.viva
        const cataractPatients = m.catMulti + m.catMono + m.catEdof
        return { year, month: i + 1, ...m, visionPatients, cataractPatients, total: visionPatients + cataractPatients }
      }),
    )

    return HttpResponse.json({ success: true, data })
  }),
  http.get('/api/stats/surgery-ratio', ({ request }) => {
    const url = new URL(request.url)
    const years = (url.searchParams.get('years') ?? '').split(',').map(Number).filter(Boolean)
    if (!years.length) years.push(new Date().getFullYear())

    const genSurgeryMonth = (i: number, seed: number) => {
      const base = 20 + ((i * 3 + seed) % 15)
      return {
        lasek: base + 2, lasik: base + 5, smile: base + 8, smilePro: base + 3,
        icl: Math.max(3, base - 10), tIcl: Math.max(2, base - 12), kpl: 4, tKpl: 2, viva: 3,
        catMulti: base, catMono: base + 4, catEdof: Math.max(1, base - 15),
      }
    }

    const data = years.flatMap((year) =>
      Array.from({ length: 12 }, (_, i) => {
        const m = genSurgeryMonth(i, year)
        const total = m.lasek + m.lasik + m.smile + m.smilePro + m.icl + m.tIcl + m.kpl + m.tKpl + m.viva + m.catMulti + m.catMono + m.catEdof
        return { year, month: i + 1, ...m, total }
      }),
    )

    return HttpResponse.json({ success: true, data })
  }),
  http.get('/api/stats/consultation-rate', ({ request }) => {
    const url = new URL(request.url)
    const years = (url.searchParams.get('years') ?? '').split(',').map(Number).filter(Boolean)
    if (!years.length) years.push(new Date().getFullYear())

    const data = years.flatMap((year) =>
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
  http.get('/api/surgery-list', async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const from = url.searchParams.get('from') ?? '2026-04-01'
    const to = url.searchParams.get('to') ?? '2026-04-30'
    const data = EXAM_LIST_MOCK
      .filter((row) => row.surgeryDate >= from && row.surgeryDate <= to)
      .map((row) => ({
        chartNo: row.chartNo,
        name: row.name,
        nameEng: row.nameEng,
        surgeryCategory: '시력교정',
        surgeryDate: row.surgeryDate,
        examDate: row.examDate,
        patientType: row.surgeryRegDate >= from && row.surgeryRegDate <= to ? '신환' : '구환',
        surgeryReserveDate: row.surgeryReserveDate,
        surgeryRegDate: row.surgeryRegDate,
        surgeryTime: row.examTime,
        surgeryR: row.surgeryR,
        surgeryL: row.surgeryL,
        recommendedR: row.recommendedR,
        recommendedL: row.recommendedL,
        estimate: row.estimate,
        surgeryRate: row.surgeryRate,
        payment: row.payment,
        surgeon: row.surgeon,
        counselor: row.counselor,
        doctor: row.doctor,
        optometrist: row.optometrist,
        birth: row.birth,
        lunar: row.lunar,
        phone1: row.phone1,
        phone2: row.phone2,
        email: row.email,
        zip: row.zip,
        addr1: row.addr1,
        addr2: row.addr2,
        memo: row.memo,
        grade: row.grade,
        job: row.job,
        lastVisit: row.lastVisit,
        route: row.route,
        section: row.section,
        motiveL: row.motiveL,
        motiveM: row.motiveM,
        motiveS: row.motiveS,
        motiveMemo: row.motiveMemo,
        examMemo: row.examMemo,
        insurance: row.insurance,
        nationality: row.nationality,
      }))
    return HttpResponse.json({ success: true, data })
  }),
]
