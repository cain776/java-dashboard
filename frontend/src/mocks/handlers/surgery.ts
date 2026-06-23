import { http, HttpResponse } from 'msw'
import { EXAM_LIST_MOCK } from '../examListData'
import { parseYears } from './shared'

const genSurgeryMonth = (i: number, seed: number) => {
  const base = 20 + ((i * 3 + seed) % 15)
  return {
    lasek: base + 2, lasik: base + 5, smile: base + 8, smilePro: base + 3,
    icl: Math.max(3, base - 10), tIcl: Math.max(2, base - 12), kpl: 4, tKpl: 2, viva: 3,
    catMulti: base, catMono: base + 4, catEdof: Math.max(1, base - 15),
  }
}

const getSurgeryMonthlyData = (years: number[]) =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, i) => {
      const m = genSurgeryMonth(i, year)
      const visionPatients = m.lasek + m.lasik + m.smile + m.smilePro + m.icl + m.tIcl + m.kpl + m.tKpl + m.viva
      const cataractPatients = m.catMulti + m.catMono + m.catEdof
      return { year, month: i + 1, ...m, visionPatients, cataractPatients, total: visionPatients + cataractPatients }
    }),
  )

const getSurgeryRatioData = (years: number[]) =>
  years.flatMap((year) =>
    Array.from({ length: 12 }, (_, i) => {
      const m = genSurgeryMonth(i, year)
      const total = m.lasek + m.lasik + m.smile + m.smilePro + m.icl + m.tIcl + m.kpl + m.tKpl + m.viva + m.catMulti + m.catMono + m.catEdof
      return { year, month: i + 1, ...m, total }
    }),
  )

const surgeryMonthly = ({ request }: { request: Request }) =>
  HttpResponse.json({ success: true, data: getSurgeryMonthlyData(parseYears(request)) })

export const surgeryHandlers = [
  http.get('/api/stats/surgery/monthly', surgeryMonthly),
  http.get('/api/stats/surgery/kpi', surgeryMonthly),
  http.get('/api/stats/surgery/panel/trend', surgeryMonthly),
  http.get('/api/stats/surgery/panel/composition', surgeryMonthly),
  http.get('/api/stats/surgery-ratio', ({ request }) =>
    HttpResponse.json({ success: true, data: getSurgeryRatioData(parseYears(request)) }),
  ),

  http.get('/api/surgery-list', async ({ request }) => {
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
