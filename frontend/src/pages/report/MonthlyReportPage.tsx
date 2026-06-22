import { useMemo, Fragment, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts'
import { Printer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ReportLineChart } from '@/components/report/ReportLineChart'
import { useReservationOverallTrend } from '@/hooks/reservation/useReservationOverallTrend'
import { useOutpatientCountTrend } from '@/hooks/outpatient/useOutpatientCountTrend'
import { useProcedureExamTrend } from '@/hooks/exam/useProcedureExamTrend'
import { useExaminationTrend } from '@/hooks/exam/useExaminationTrend'
import { useSurgeryTrend } from '@/hooks/surgery/useSurgeryTrend'
import { useCataractReservationRateTrend } from '@/hooks/consultation/useCataractReservationRateTrend'
import { useStopReasonMonthly } from '@/hooks/consultation/useStopReasonMonthly'
import { useOverallExamWeekly } from '@/hooks/overall/useOverallExamWeekly'
import { useConsultationRateTrend } from '@/hooks/consultation/useConsultationRateTrend'
import type { StopReasonMonthlyItem } from '@/api/consultation'
import { MONTHLY_LEGACY_CHARTS } from '@/data/monthlyReportLegacy'
import { CURRENT_YEAR, MONTHS } from '@/constants/chart'
import { formatAxisNumber } from '@/utils/stats'

// 월간 레포트는 항상 3개년 비교: 전전년도 · 전년도 · 당해연도(=기준연도)
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]

const now = new Date()
// 진행 중인 당월은 검사·수술 등이 아직 누적 중이라 값이 급감 → 마지막 '완료된 월'까지만 표시(당월 포함 이후 null)
const isIncompleteMonth = (year: number, monthIndex: number) =>
  year > now.getFullYear() || (year === now.getFullYear() && monthIndex >= now.getMonth())

/* 예약률 2024·2025 확정값 (CataractReservationRatePage와 동일) */
const VISION_RATE_LEGACY: Record<number, number[]> = {
  2024: [77, 79, 77, 76, 78, 80, 76, 80, 79, 75, 72, 74],
  2025: [75, 76, 79, 77, 76, 75, 77, 77, 76, 82, 77, 75],
}
const CATARACT_RATE_LEGACY: Record<number, number[]> = {
  2024: [64, 69, 66, 80, 62, 65, 66, 67, 63, 74, 57, 77],
  2025: [68, 57, 59, 49, 58, 44, 55, 63, 57, 55, 57, 55],
}

/* ── 중단 사유 (막대, 최신월) ── */
const SUSPEND_COLOR = '#93C5FD'
const IMPOSSIBLE_COLOR = '#2563EB'
const TOTAL_COLOR = '#1E3A8A'

const REASONS: { key: keyof StopReasonMonthlyItem; label: string; color: string }[] = [
  { key: 'other', label: '기타', color: SUSPEND_COLOR },
  { key: 'glaucoma', label: '불가-녹내장', color: SUSPEND_COLOR },
  { key: 'visionChange', label: '불가-시력변화', color: SUSPEND_COLOR },
  { key: 'recommendX', label: '불가-수술권유X', color: IMPOSSIBLE_COLOR },
  { key: 'lensImpossible', label: '불가-렌즈삽입불가', color: IMPOSSIBLE_COLOR },
  { key: 'keratoconus', label: '불가-원추각막', color: IMPOSSIBLE_COLOR },
  { key: 'avellino', label: '불가-아벨리노', color: IMPOSSIBLE_COLOR },
]

const stopReasonConfig: ChartConfig = { value: { label: '건수', color: IMPOSSIBLE_COLOR } }

function StopReasonBar({ item, monthLabel }: { item: StopReasonMonthlyItem | null; monthLabel: string }) {
  const chartData = useMemo(() => {
    const rows = REASONS.map((r) => ({
      name: r.label,
      value: item ? (item[r.key] as number) : 0,
      color: r.color,
    }))
    rows.push({ name: '월 중단합계', value: item?.total ?? 0, color: TOTAL_COLOR })
    return rows
  }, [item])

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-center text-lg">
          중단 사유<span className="text-sm font-medium text-muted-foreground"> ({monthLabel})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={stopReasonConfig} className="report-chart-area aspect-auto h-[480px] w-full">
          <BarChart data={chartData} margin={{ top: 28, left: 0, right: 16, bottom: 24 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" interval={0} tickLine={false} axisLine={false} tickMargin={8} height={60} tick={{ fontSize: 11 }} />
            <YAxis width={40} allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="value" position="top" className="fill-foreground" fontSize={13} fontWeight={700} />
              {chartData.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* ── 수술 상세표 (시술별, 라이브) ── */
type SurgeryCell = {
  lasek: number; lasik: number; smile: number; smilePro: number
  icl: number; tIcl: number; kpl: number; tKpl: number; viva: number
  catMulti: number; catMono: number; catEdof: number
  xtra: number; waveVision: number; monoVision: number; reoperation: number
  visionPatients: number; cataractPatients: number; total: number
}

const VISION_COLS: { key: keyof SurgeryCell; label: string }[] = [
  { key: 'lasek', label: '라섹' }, { key: 'lasik', label: '라식' },
  { key: 'smile', label: '스마일' }, { key: 'smilePro', label: '스마일프로' },
  { key: 'icl', label: 'ICL' }, { key: 'tIcl', label: 'T-ICL' },
  { key: 'kpl', label: 'KPL' }, { key: 'tKpl', label: 'T-KPL' }, { key: 'viva', label: 'VIVA' },
]
// 시력교정 부가시술(add-on) + 재수술
const ADDON_COLS: { key: keyof SurgeryCell; label: string }[] = [
  { key: 'xtra', label: '엑스트라' }, { key: 'waveVision', label: '웨이브비전' },
  { key: 'monoVision', label: '모노비전' }, { key: 'reoperation', label: '재수술' },
]
const CATARACT_COLS: { key: keyof SurgeryCell; label: string }[] = [
  { key: 'catMulti', label: '다초점' }, { key: 'catMono', label: '단초점' }, { key: 'catEdof', label: 'EDOF' },
]

function ReportSurgeryTable({ dataMap }: { dataMap: Record<number, SurgeryCell[]> }) {
  const rows = useMemo(() => {
    const arr = dataMap[CURRENT_YEAR] ?? []
    return arr
      .map((cell, i) => ({ month: MONTHS[i], i, cell }))
      .filter((r) => !isIncompleteMonth(CURRENT_YEAR, r.i) && r.cell && r.cell.total > 0)
  }, [dataMap])

  if (!rows.length) return null
  const sum = (key: keyof SurgeryCell) => rows.reduce((s, r) => s + (r.cell[key] || 0), 0)
  const cell = (v: number) => (v ? formatAxisNumber(v) : '')

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-center text-lg">
          수술 상세<span className="text-sm font-medium text-muted-foreground"> (시술별 · {CURRENT_YEAR}년)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-center text-[11px]">
            <thead>
              <tr className="border-y border-border bg-muted/40">
                <th className="py-1.5">월</th>
                <th className="py-1.5">총수술</th>
                <th className="py-1.5 text-blue-700">시력교정</th>
                {VISION_COLS.map((c) => <th key={c.key} className="py-1.5">{c.label}</th>)}
                {ADDON_COLS.map((c) => <th key={c.key} className="py-1.5 text-emerald-700">{c.label}</th>)}
                <th className="py-1.5 text-violet-700">백내장</th>
                {CATARACT_COLS.map((c) => <th key={c.key} className="py-1.5">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b border-border">
                  <td className="py-1.5 font-semibold">{r.month}</td>
                  <td className="py-1.5 font-semibold tabular-nums">{cell(r.cell.total)}</td>
                  <td className="py-1.5 tabular-nums text-blue-700">{cell(r.cell.visionPatients)}</td>
                  {VISION_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums">{cell(r.cell[c.key])}</td>)}
                  {ADDON_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums text-emerald-700">{cell(r.cell[c.key])}</td>)}
                  <td className="py-1.5 tabular-nums text-violet-700">{cell(r.cell.cataractPatients)}</td>
                  {CATARACT_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums">{cell(r.cell[c.key])}</td>)}
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="py-1.5">합계</td>
                <td className="py-1.5 tabular-nums">{cell(sum('total'))}</td>
                <td className="py-1.5 tabular-nums text-blue-700">{cell(sum('visionPatients'))}</td>
                {VISION_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums">{cell(sum(c.key))}</td>)}
                {ADDON_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums text-emerald-700">{cell(sum(c.key))}</td>)}
                <td className="py-1.5 tabular-nums text-violet-700">{cell(sum('cataractPatients'))}</td>
                {CATARACT_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums">{cell(sum(c.key))}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          ※ 운영 DB 라이브(시술별). 엑스트라·웨이브비전·모노비전은 시력교정 부가시술(환자 수 기준),
          재수술은 RE_OPERATION 안(眼) 단위. 재수술 분류 기준(EN/익스체인지 포함·백내장 IOL 제외)은 팀장 검증 예정(Phase 2).
        </p>
      </CardContent>
    </Card>
  )
}

/** 월간 레포트 로딩 스켈레톤 — 차트 카드(제목·범례·차트영역·표) 모양을 펄스로 표시 */
function ReportChartSkeleton() {
  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center gap-2 pb-2">
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        <div className="flex gap-5 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-3 w-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex h-[480px] flex-col justify-between py-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-px w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** overall-exam/weekly 주간 항목을 월별로 합산한 값 (당해연도 라이브 도표용) */
interface OverallMonthSums {
  introGeneral: number
  introCustomer: number
  introStaff: number
  jobOffice: number
  jobStudent: number
  jobEtc: number
  visionExam: number
  oneDay: number
  visionBooked: number
  oneDayBooked: number
  stopCount: number
}

export function MonthlyReportPage() {
  const resv = useReservationOverallTrend(YEARS)
  const outpatient = useOutpatientCountTrend(YEARS)
  const procedure = useProcedureExamTrend(YEARS)
  const exam = useExaminationTrend(YEARS)
  const surgery = useSurgeryTrend(YEARS)
  const stopReason = useStopReasonMonthly([CURRENT_YEAR])
  const visionRate = useCataractReservationRateTrend([CURRENT_YEAR], 'vision')
  const cataractRate = useCataractReservationRateTrend([CURRENT_YEAR], 'cataract')
  const overall = useOverallExamWeekly([CURRENT_YEAR])
  const consult = useConsultationRateTrend(YEARS) // 시력교정 상담성공률(전체) — 3개년 라이브

  // 당해연도 주간 항목을 월(1~12)별로 합산 — 검사유입·세그먼트 도표의 라이브 분모분자
  const overallMonthly = useMemo(() => {
    const acc: Record<number, OverallMonthSums> = {}
    for (const it of overall.items) {
      if (it.year !== CURRENT_YEAR) continue
      const s = acc[it.month] ?? {
        introGeneral: 0, introCustomer: 0, introStaff: 0,
        jobOffice: 0, jobStudent: 0, jobEtc: 0,
        visionExam: 0, oneDay: 0, visionBooked: 0, oneDayBooked: 0, stopCount: 0,
      }
      s.introGeneral += it.introGeneral
      s.introCustomer += it.introCustomer
      s.introStaff += it.introStaff
      s.jobOffice += it.jobOffice
      s.jobStudent += it.jobStudent
      s.jobEtc += it.jobEtc
      s.visionExam += it.visionExam
      s.oneDay += it.oneDay
      s.visionBooked += it.visionBooked
      s.oneDayBooked += it.oneDayBooked
      s.stopCount += it.stopCount
      acc[it.month] = s
    }
    return acc
  }, [overall.items])

  const charts = useMemo(() => {
    // 연도별 12개월 배열 빌더 — 미래월은 null(선 끊김)
    const build = (pick: (year: number, i: number) => number | null | undefined): Record<number, (number | null)[]> => {
      const out: Record<number, (number | null)[]> = {}
      YEARS.forEach((y) => {
        out[y] = Array.from({ length: 12 }, (_, i) => {
          if (isIncompleteMonth(y, i)) return null
          const v = pick(y, i)
          return typeof v === 'number' ? v : null
        })
      })
      return out
    }

    // 예약률: 2024·2025 확정값 + 2026 API
    const rateMap = (
      legacy: Record<number, number[]>,
      rateData: Record<number, { examCount: number; reservationRate: number }[]>,
    ): Record<number, (number | null)[]> => {
      const out: Record<number, (number | null)[]> = {}
      YEARS.forEach((y) => {
        if (legacy[y]) {
          out[y] = legacy[y]
          return
        }
        out[y] = Array.from({ length: 12 }, (_, i) => {
          if (isIncompleteMonth(y, i)) return null
          const it = rateData[y]?.[i]
          return it && it.examCount ? Math.ceil(it.reservationRate) : null
        })
      })
      return out
    }

    // 2024·2025 = 레거시 확정값, 당해연도 = overall-exam/weekly 월합산 라이브
    const liveOrLegacy = (
      legacyKey: string,
      pick: (s: OverallMonthSums) => number | null,
    ): Record<number, (number | null)[]> => {
      const legacy = MONTHLY_LEGACY_CHARTS[legacyKey].data
      const out: Record<number, (number | null)[]> = {}
      YEARS.forEach((y) => {
        if (y !== CURRENT_YEAR && legacy[y]) {
          out[y] = legacy[y]
          return
        }
        out[y] = Array.from({ length: 12 }, (_, i) => {
          if (isIncompleteMonth(y, i)) return null
          const s = overallMonthly[i + 1]
          return s ? pick(s) : null
        })
      })
      return out
    }

    return {
      reservations: build((y, i) => resv.dataMap[y]?.[i]?.reservations),
      call: build((y, i) => resv.dataMap[y]?.[i]?.call),
      online: build((y, i) => resv.dataMap[y]?.[i]?.online),
      cataractExam: build((y, i) => exam.dataMap[y]?.[i]?.cataract),
      visionExam: build((y, i) => exam.dataMap[y]?.[i]?.visionCorrection),
      examCount: build((y, i) => procedure.dataMap[y]?.[i]?.examCount),
      oneDayExam: build((y, i) => procedure.dataMap[y]?.[i]?.oneDayExamCount),
      cataractRate: rateMap(CATARACT_RATE_LEGACY, cataractRate.dataMap),
      visionRate: rateMap(VISION_RATE_LEGACY, visionRate.dataMap),
      cataractSurgery: build((y, i) => surgery.dataMap[y]?.[i]?.cataractPatients),
      visionSurgery: build((y, i) => surgery.dataMap[y]?.[i]?.visionPatients),
      totalSurgery: build((y, i) => surgery.dataMap[y]?.[i]?.total),
      outpatient: build((y, i) => outpatient.dataMap[y]?.[i]?.outpatientCount),
      // 시력교정 상담성공률(전체) = 상담→수술예약(visionCounselRate), consultation-rate 3개년 라이브
      counselSuccess: build((y, i) => consult.dataMap[y]?.[i]?.visionConsultation || null),
      // 🟢 라이브 전환 (overall-exam/weekly 월합산) — 2024·2025 레거시 확정값, 당해연도 라이브
      examGeneralCustomer: liveOrLegacy('exam-general-customer', (s) => s.introGeneral),
      examReferralCustomer: liveOrLegacy('exam-referral-customer', (s) => s.introCustomer),
      examReferralStaff: liveOrLegacy('exam-referral-staff', (s) => s.introStaff),
      examWorker: liveOrLegacy('exam-worker', (s) => s.jobOffice),
      examStudent: liveOrLegacy('exam-student', (s) => s.jobStudent),
      examEtc: liveOrLegacy('exam-etc', (s) => s.jobEtc),
      examGeneral: liveOrLegacy('exam-general', (s) => s.visionExam - s.oneDay),
      ratioGeneral: liveOrLegacy('ratio-general', (s) =>
        s.visionExam > 0 ? ((s.visionExam - s.oneDay) / s.visionExam) * 100 : null,
      ),
      rateVisionGeneral: liveOrLegacy('rate-vision-general', (s) => {
        const den = s.visionExam - s.oneDay
        return den > 0 ? ((s.visionBooked - s.oneDayBooked) / den) * 100 : null
      }),
      rateOneday: liveOrLegacy('rate-oneday', (s) =>
        s.oneDay > 0 ? (s.oneDayBooked / s.oneDay) * 100 : null,
      ),
      stopRate: liveOrLegacy('stop-rate', (s) =>
        s.visionExam > 0 ? (s.stopCount / s.visionExam) * 100 : null,
      ),
    }
  }, [resv.dataMap, outpatient.dataMap, procedure.dataMap, exam.dataMap, surgery.dataMap, visionRate.dataMap, cataractRate.dataMap, consult.dataMap, overallMonthly])

  // 최신(데이터 있는) 월 — 리포트 기준월
  const latestMonthIdx = useMemo(() => {
    const cur = charts.reservations[CURRENT_YEAR] ?? []
    for (let i = 11; i >= 0; i--) if (typeof cur[i] === 'number') return i
    return 0
  }, [charts])

  const stopReasonItem = stopReason.dataMap[CURRENT_YEAR]?.[latestMonthIdx] ?? null
  const periodLabel = `${CURRENT_YEAR}년 ${latestMonthIdx + 1}월`

  const isLoading =
    resv.isLoading || outpatient.isLoading || procedure.isLoading || exam.isLoading || surgery.isLoading || stopReason.isLoading || overall.isLoading || consult.isLoading

  // 전체 도표 목차(월간보고 순서). node 있으면 완료(차트 렌더+목차 링크), 없으면 미완성(목차 회색 표시).
  const items: { group: string; id: string; label: string; node?: ReactNode }[] = [
    { group: '예약', id: 'reservation-overall', label: '예약 종합 (콜·온라인)', node: <ReportLineChart title="예약 종합" suffix="(콜, 온라인)" years={YEARS} data={charts.reservations} /> },
    { group: '예약', id: 'reservation-call', label: '콜 예약 (인콜·아웃콜)', node: <ReportLineChart title="콜 예약" suffix="(인콜, 아웃콜)" years={YEARS} data={charts.call} /> },
    { group: '예약', id: 'reservation-online', label: '온라인 예약 (네이버·카카오·홈페이지)', node: <ReportLineChart title="온라인 예약" suffix="(네이버, 카카오, 홈페이지)" years={YEARS} data={charts.online} /> },
    { group: '검사 유입', id: 'exam-general-customer', label: '일반 고객 검사 (소개 제외)', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-general-customer']} years={YEARS} data={charts.examGeneralCustomer} /> },
    { group: '검사 유입', id: 'exam-referral-customer', label: '고객소개 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-referral-customer']} years={YEARS} data={charts.examReferralCustomer} /> },
    { group: '검사 유입', id: 'exam-referral-staff', label: '직원소개 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-referral-staff']} years={YEARS} data={charts.examReferralStaff} /> },
    { group: '검사 유입', id: 'exam-by-class', label: '고객분류별 검사수' },
    { group: '검사 유입', id: 'exam-worker', label: '직장인 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-worker']} years={YEARS} data={charts.examWorker} /> },
    { group: '검사 유입', id: 'exam-student', label: '학생 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-student']} years={YEARS} data={charts.examStudent} /> },
    { group: '검사 유입', id: 'exam-etc', label: '기타 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-etc']} years={YEARS} data={charts.examEtc} /> },
    { group: '검사수', id: 'exam-cataract', label: '백내장 검사수', node: <ReportLineChart title="백내장 검사수" years={YEARS} data={charts.cataractExam} /> },
    { group: '검사수', id: 'exam-vision', label: '시력교정 검사', node: <ReportLineChart title="시력교정 검사" years={YEARS} data={charts.visionExam} /> },
    { group: '검사수', id: 'exam-count', label: '검사수', node: <ReportLineChart title="검사수" years={YEARS} data={charts.examCount} /> },
    { group: '검사수', id: 'exam-oneday', label: '원데이 검사', node: <ReportLineChart title="원데이 검사" years={YEARS} data={charts.oneDayExam} /> },
    { group: '검사수', id: 'exam-general', label: '일반 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-general']} years={YEARS} data={charts.examGeneral} /> },
    { group: '비율', id: 'ratio-general', label: '일반검사 비율', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['ratio-general']} years={YEARS} data={charts.ratioGeneral} /> },
    { group: '비율', id: 'rate-cataract', label: '백내장 예약률', node: <ReportLineChart title="백내장 예약률" suffix="(수술예약건/검사자)" years={YEARS} data={charts.cataractRate} format="percent" /> },
    { group: '비율', id: 'rate-vision', label: '시력교정 예약률', node: <ReportLineChart title="시력교정 예약률" suffix="(수술예약건/검사자)" years={YEARS} data={charts.visionRate} format="percent" /> },
    { group: '비율', id: 'rate-vision-general', label: '시력교정 일반예약률', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['rate-vision-general']} years={YEARS} data={charts.rateVisionGeneral} /> },
    { group: '비율', id: 'rate-oneday', label: '원데이 예약률', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['rate-oneday']} years={YEARS} data={charts.rateOneday} /> },
    { group: '전환&성공', id: 'success-rate', label: '시력교정 상담성공률', node: <ReportLineChart title="시력교정 상담성공률" suffix="(상담→수술예약)" years={YEARS} data={charts.counselSuccess} format="percent" /> },
    { group: '중단', id: 'stop-rate', label: '중단율', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['stop-rate']} years={YEARS} data={charts.stopRate} /> },
    { group: '중단', id: 'stop-reason', label: '중단 사유', node: <StopReasonBar item={stopReasonItem} monthLabel={periodLabel} /> },
    { group: '수술', id: 'surgery-cataract', label: '백내장 수술', node: <ReportLineChart title="백내장 수술" years={YEARS} data={charts.cataractSurgery} /> },
    { group: '수술', id: 'surgery-vision', label: '시력교정 수술', node: <ReportLineChart title="시력교정 수술" years={YEARS} data={charts.visionSurgery} /> },
    { group: '수술', id: 'surgery-total', label: '총 수술수', node: <ReportLineChart title="총 수술수" years={YEARS} data={charts.totalSurgery} /> },
    { group: '수술', id: 'surgery-detail', label: '수술 상세표', node: <ReportSurgeryTable dataMap={surgery.dataMap} /> },
    { group: '외래', id: 'outpatient', label: '외래수', node: <ReportLineChart title="외래수" years={YEARS} data={charts.outpatient} /> },
  ]
  const doneCount = items.filter((it) => it.node).length

  return (
    <div className="flex justify-center gap-6">
      {/* 좌측 컬럼: 목차를 콘텐츠 왼쪽 끝에. 우측 spacer와 함께 본문을 정중앙 정렬 (화면 전용) */}
      <div className="hidden w-0 flex-1 justify-start min-[1520px]:flex">
        <nav className="report-no-print sticky top-3 h-[calc(100vh-6rem)] w-[210px] overflow-y-auto rounded-lg border border-border/70 bg-white p-3 shadow-sm">
        <p className="mb-1 px-1 text-xs font-bold text-foreground">
          전체 도표 <span className="font-medium text-muted-foreground">({doneCount}/{items.length})</span>
        </p>
        <ul className="space-y-0.5 text-[13px]">
          {items.map((it, idx) => {
            const showGroup = idx === 0 || items[idx - 1].group !== it.group
            return (
              <Fragment key={it.id}>
                {showGroup && (
                  <li className="px-1 pt-2 text-[11px] font-bold text-muted-foreground">{it.group}</li>
                )}
                <li>
                  {it.node ? (
                    <a href={`#c-${it.id}`} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-gray-700 hover:bg-blue-50">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span className="truncate">{it.label}</span>
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 px-1.5 py-1 text-gray-400">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-gray-300" />
                      <span className="truncate">{it.label}</span>
                    </span>
                  )}
                </li>
              </Fragment>
            )
          })}
        </ul>
        </nav>
      </div>

      {/* 본문(인쇄 영역) — 정중앙 */}
      <div id="report-print" className="shrink-0 space-y-6">
        {/* 헤더 + PDF 버튼 (인쇄 시 숨김) */}
        <div className="report-no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">월간 레포트</h1>
            <p className="text-sm text-muted-foreground">
              {periodLabel} 기준 · 당해연도({CURRENT_YEAR})·전년도({CURRENT_YEAR - 1})·전전년도({CURRENT_YEAR - 2}) 3개년 비교
              {' · '}
              {CURRENT_YEAR - 2}·{CURRENT_YEAR - 1} 확정값 + {CURRENT_YEAR} 운영 DB 라이브
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700"
          >
            <Printer className="h-4 w-4" />
            PDF로 저장
          </button>
        </div>

        {isLoading ? (
          <div className="mx-auto w-[1040px] space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <ReportChartSkeleton key={i} />
            ))}
          </div>
        ) : (
          // 고정폭(1040px): 화면·인쇄 차트 크기를 동일하게 → Recharts 재측정 없이 PDF에 12개월 전부·정렬 유지.
          <div className="mx-auto w-[1040px] space-y-6">
            {items
              .filter((it) => it.node)
              .map((it) => (
                <div key={it.id} id={`c-${it.id}`} className="scroll-mt-4">
                  {it.node}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 우측 spacer: 좌측 목차와 동일 폭으로 본문을 정중앙에 고정 */}
      <div className="hidden w-0 flex-1 min-[1520px]:block" aria-hidden />
    </div>
  )
}
