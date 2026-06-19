import { CalendarRange, CalendarDays } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type ReportVariant = 'weekly' | 'monthly'

interface ReportConfig {
  title: string
  description: string
  periodLabel: string
  icon: typeof CalendarRange
}

const CONFIG: Record<ReportVariant, ReportConfig> = {
  weekly: {
    title: '주간 레포트',
    description: '한 주간의 핵심 KPI를 한눈에 정리한 리포트입니다.',
    periodLabel: '이번 주',
    icon: CalendarRange,
  },
  monthly: {
    title: '월간 레포트',
    description: '한 달간의 핵심 KPI를 한눈에 정리한 리포트입니다.',
    periodLabel: '이번 달',
    icon: CalendarDays,
  },
}

/** 리포트 상단 요약 KPI (데이터 연결 전 자리 표시) */
const SUMMARY_KPIS = [
  { key: 'reservation', label: '예약', unit: '건', accent: 'text-blue-600 bg-blue-50' },
  { key: 'exam', label: '검사', unit: '건', accent: 'text-emerald-600 bg-emerald-50' },
  { key: 'surgery', label: '수술', unit: '건', accent: 'text-violet-600 bg-violet-50' },
  { key: 'conversion', label: '전환율', unit: '%', accent: 'text-amber-600 bg-amber-50' },
]

/** 리포트에 들어갈 섹션 구성 (구현 예정 항목) */
const SECTIONS = [
  { title: '예약 종합', desc: '콜·온라인 예약 추이와 전주/전월 대비 증감.' },
  { title: '검사·수술 건수', desc: '시력교정·백내장·드림렌즈 검사와 수술 실적.' },
  { title: '전환·성공률', desc: '검사 → 수술 전환율과 백내장 예약률 변화.' },
  { title: '특이사항', desc: '취소·부도, 채널별 이슈 등 코멘트 영역.' },
]

export function ReportPage({ variant }: { variant: ReportVariant }) {
  const cfg = CONFIG[variant]
  const Icon = cfg.icon

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{cfg.title}</h1>
            <p className="text-sm text-muted-foreground">{cfg.description}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm">
          <Icon className="h-4 w-4 text-gray-500" />
          {cfg.periodLabel}
        </span>
      </div>

      {/* 요약 KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SUMMARY_KPIS.map((kpi) => (
          <Card key={kpi.key} className="border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <span
                className={`inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-semibold ${kpi.accent}`}
              >
                {kpi.label}
              </span>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums text-gray-400">—</span>
                <span className="text-sm text-muted-foreground">{kpi.unit}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">데이터 연결 예정</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 리포트 구성 */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>리포트 구성</CardTitle>
          <CardDescription>
            {cfg.periodLabel} 기준으로 아래 항목을 채워 나갑니다. (현재는 화면 골격 단계)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {SECTIONS.map((section) => (
              <div
                key={section.title}
                className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4"
              >
                <p className="text-sm font-semibold text-gray-900">{section.title}</p>
                <p className="mt-1 text-sm text-gray-600">{section.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function WeeklyReportPage() {
  return <ReportPage variant="weekly" />
}
