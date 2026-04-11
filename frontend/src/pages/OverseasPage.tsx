import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  StatsSelect,
  TrendChip,
} from '@/components/stats/StatsPrimitives'
import { changePoint, changeRate } from '@/components/stats/stats-utils'
import { formatAxisNumber, getCurrentPeriod } from '@/utils/stats'

type CountryKey = 'japan' | 'china' | 'sea' | 'americas' | 'other'

interface MonthlyData {
  inquiries: number
  visitRate: number
  examinations: number
  surgeries: number
  surgeryConversion: number
  localOutpatient: number
  agencyContracts: number
  expoEvents: number
  revenue: number
  countries: Record<CountryKey, number>
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, index) => CURRENT_YEAR - index)
const CURRENT_PERIOD = getCurrentPeriod()
const DEFAULT_YEAR = YEARS.includes(CURRENT_PERIOD.year) ? CURRENT_PERIOD.year : YEARS[0]
const DEFAULT_MONTH = CURRENT_PERIOD.month
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const yearOptions = YEARS.map((year) => ({ value: year, label: `${year}년` }))
const monthOptions = MONTHS.map((month, index) => ({ value: index, label: month }))

const COUNTRIES: { key: CountryKey; label: string; color: string }[] = [
  { key: 'japan', label: '일본', color: 'var(--chart-1)' },
  { key: 'china', label: '중국', color: 'var(--chart-3)' },
  { key: 'sea', label: '동남아', color: 'var(--chart-4)' },
  { key: 'americas', label: '미주', color: 'var(--chart-5)' },
  { key: 'other', label: '기타', color: '#94a3b8' },
]

const emptyData = (): MonthlyData => ({
  inquiries: 0,
  visitRate: 0,
  examinations: 0,
  surgeries: 0,
  surgeryConversion: 0,
  localOutpatient: 0,
  agencyContracts: 0,
  expoEvents: 0,
  revenue: 0,
  countries: { japan: 0, china: 0, sea: 0, americas: 0, other: 0 },
})

const buildCountryMix = (inquiries: number, monthIndex: number, yearDelta: number) => {
  const japan = Math.max(0, Math.round(inquiries * (0.34 + Math.sin(monthIndex * 0.45 + 0.2) * 0.03) + yearDelta * 2))
  const china = Math.max(0, Math.round(inquiries * (0.21 + Math.cos(monthIndex * 0.38 + 0.6) * 0.02) + yearDelta))
  const sea = Math.max(0, Math.round(inquiries * (0.19 + Math.sin(monthIndex * 0.52 + 1.1) * 0.02) + yearDelta * 1.5))
  const americas = Math.max(0, Math.round(inquiries * (0.14 + Math.cos(monthIndex * 0.41 + 1.8) * 0.015) + yearDelta))

  return {
    japan,
    china,
    sea,
    americas,
    other: Math.max(0, inquiries - japan - china - sea - americas),
  }
}

const buildYearData = (year: number): MonthlyData[] => {
  const yearDelta = year - 2024

  return MONTHS.map((_, monthIndex) => {
    const inquiries = Math.max(
      48,
      Math.round(
        88 +
          yearDelta * 11 +
          Math.sin((monthIndex / 12) * Math.PI * 2 + 0.3) * 15 +
          (monthIndex === 6 || monthIndex === 9 ? 10 : 0),
      ),
    )
    const visitRate = Number((44 + yearDelta * 1.4 + Math.sin((monthIndex / 12) * Math.PI * 2 + 0.8) * 2.8).toFixed(1))
    const examinations = Math.max(24, Math.round(inquiries * ((visitRate - 8) / 100)))
    const surgeries = Math.max(8, Math.round(examinations * (0.31 + yearDelta * 0.01 + Math.cos((monthIndex / 12) * Math.PI * 2 + 1.1) * 0.025)))

    return {
      inquiries,
      visitRate,
      examinations,
      surgeries,
      surgeryConversion: Number(((surgeries / Math.max(examinations, 1)) * 100).toFixed(1)),
      localOutpatient: Math.max(10, Math.round(24 + yearDelta * 2 + Math.cos((monthIndex / 12) * Math.PI * 2 + 0.5) * 4)),
      agencyContracts: Math.max(4, Math.round(7 + yearDelta + (monthIndex >= 5 ? 1 : 0))),
      expoEvents: Math.max(0, Math.round((monthIndex % 4 === 0 ? 1 : 0) + (monthIndex === 9 ? 1 : 0))),
      revenue: Math.round(surgeries * 46 + examinations * 4 + yearDelta * 18),
      countries: buildCountryMix(inquiries, monthIndex, yearDelta),
    }
  })
}

const mockData = Object.fromEntries(YEARS.map((year) => [year, buildYearData(year)])) as Record<number, MonthlyData[]>

const funnelConfig = {
  previous: { label: '직전 기준', color: '#cbd5e1' },
  current: { label: '선택 기준', color: 'var(--chart-1)' },
} satisfies ChartConfig

const trendConfig = {
  inquiries: { label: '문의 유입', color: 'var(--chart-1)' },
  examinations: { label: '검사 건수', color: 'var(--chart-3)' },
  surgeries: { label: '수술 건수', color: 'var(--chart-4)' },
} satisfies ChartConfig

const countryConfig = Object.fromEntries(
  COUNTRIES.map((country) => [
    country.key,
    {
      label: country.label,
      color: country.color,
    },
  ]),
) satisfies ChartConfig

function formatRevenue(value: number) {
  return `${(value / 100).toFixed(1)}억원`
}

export function OverseasPage() {
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR)
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH)

  const currentData = mockData[selectedYear]?.[selectedMonth] ?? emptyData()
  const previousData =
    selectedMonth > 0
      ? mockData[selectedYear]?.[selectedMonth - 1] ?? emptyData()
      : mockData[selectedYear - 1]?.[11] ?? emptyData()

  const summaryItems = [
    {
      key: 'inquiries',
      title: '문의 유입',
      value: `${currentData.inquiries.toLocaleString()}건`,
      caption: '해외 환자 문의 수',
      change: changeRate(previousData.inquiries, currentData.inquiries),
      suffix: '%',
    },
    {
      key: 'visitRate',
      title: '내원율',
      value: `${currentData.visitRate.toFixed(1)}%`,
      caption: '문의 대비 실제 내원 비율',
      change: changePoint(previousData.visitRate, currentData.visitRate),
      suffix: '%p',
    },
    {
      key: 'examinations',
      title: '검사 건수',
      value: `${currentData.examinations.toLocaleString()}건`,
      caption: '실제 실시 검사 수',
      change: changeRate(previousData.examinations, currentData.examinations),
      suffix: '%',
    },
    {
      key: 'surgeries',
      title: '수술 건수',
      value: `${currentData.surgeries.toLocaleString()}건`,
      caption: '해외 환자 수술 수',
      change: changeRate(previousData.surgeries, currentData.surgeries),
      suffix: '%',
    },
    {
      key: 'surgeryConversion',
      title: '수술 전환율',
      value: `${currentData.surgeryConversion.toFixed(1)}%`,
      caption: '검사 대비 수술 전환 비율',
      change: changePoint(previousData.surgeryConversion, currentData.surgeryConversion),
      suffix: '%p',
    },
  ]

  const funnelData = [
    { stage: '문의 유입', previous: previousData.inquiries, current: currentData.inquiries },
    {
      stage: '내원 환자',
      previous: Math.round(previousData.inquiries * (previousData.visitRate / 100)),
      current: Math.round(currentData.inquiries * (currentData.visitRate / 100)),
    },
    { stage: '검사 건수', previous: previousData.examinations, current: currentData.examinations },
    { stage: '수술 건수', previous: previousData.surgeries, current: currentData.surgeries },
  ]

  const countryData = COUNTRIES.map((country) => ({
    key: country.key,
    name: country.label,
    value: currentData.countries[country.key],
    fill: country.color,
  }))

  const trendData = useMemo(
    () =>
      MONTHS.map((month, index) => ({
        month,
        inquiries: mockData[selectedYear]?.[index]?.inquiries ?? 0,
        examinations: mockData[selectedYear]?.[index]?.examinations ?? 0,
        surgeries: mockData[selectedYear]?.[index]?.surgeries ?? 0,
      })),
    [selectedYear],
  )

  const totalCountries = countryData.reduce((sum, item) => sum + item.value, 0)
  const topCountry = [...countryData].sort((left, right) => right.value - left.value)[0]

  return (
    <div className="space-y-6">
      <Card className="border-border/70 shadow-sm !py-0">
        <CardContent className="flex min-h-14 flex-wrap items-center gap-2 py-1.5">
          <div className="flex h-8 items-center rounded-md bg-gray-100 px-3 text-sm font-medium text-gray-700">
            해외 환자 관련 지표
          </div>
          <div className="h-5 w-px bg-gray-200" />
          <StatsSelect value={selectedYear} onChange={setSelectedYear} options={yearOptions} title="연도 선택" />
          <StatsSelect value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} title="월 선택" />
          <span className="ml-auto text-sm text-muted-foreground">
            {selectedYear}년 {MONTHS[selectedMonth]} 기준
          </span>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryItems.map((item) => (
          <Card key={item.key} className="gap-2 border-border/70 shadow-sm">
            <CardHeader className="gap-0.5 pb-0">
              <CardTitle className="text-base font-semibold text-gray-900">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <p className="text-3xl font-semibold tracking-tight text-gray-900">{item.value}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{item.caption}</p>
                <TrendChip value={item.change} suffix={item.suffix} />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>해외 환자 전환 퍼널</CardTitle>
            <CardDescription>문의 유입부터 검사, 수술까지의 진행량을 직전 기준과 비교합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={funnelConfig} className="h-80 w-full">
              <BarChart data={funnelData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="stage" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
                <ChartLegend content={<ChartLegendContent />} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="previous" fill="var(--color-previous)" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="current" fill="var(--color-current)" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>국가별 분포</CardTitle>
            <CardDescription>{topCountry?.name ?? '-'} 비중이 가장 높게 나타납니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ChartContainer config={countryConfig} className="mx-auto h-72 w-full max-w-[320px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={countryData} dataKey="value" nameKey="key" innerRadius={62} outerRadius={96} paddingAngle={4} strokeWidth={3}>
                  {countryData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="space-y-2 text-sm">
              {countryData.map((entry) => (
                <div key={entry.key} className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                  <span>{entry.name}</span>
                  <span className="ml-auto font-medium text-foreground">
                    {totalCountries ? ((entry.value / totalCountries) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>월별 해외 환자 흐름</CardTitle>
            <CardDescription>문의 유입, 검사 건수, 수술 건수의 연간 흐름을 함께 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-80 w-full">
              <LineChart data={trendData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
                <ChartLegend content={<ChartLegendContent />} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="inquiries" stroke="var(--color-inquiries)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="examinations" stroke="var(--color-examinations)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="surgeries" stroke="var(--color-surgeries)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>운영 지표 요약</CardTitle>
            <CardDescription>보조 지표를 실제 화면처럼 한 눈에 보이도록 묶었습니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">외래 현지 건 수</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{currentData.localOutpatient.toLocaleString()}건</p>
              <p className="mt-1 text-sm text-gray-600">현지 follow-up 및 외래 응대 건수</p>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">에이전시 계약</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{currentData.agencyContracts.toLocaleString()}건</p>
              <p className="mt-1 text-sm text-gray-600">월 기준 활성 계약 에이전시 수</p>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">현지 상담회/박람회 참가</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{currentData.expoEvents.toLocaleString()}회</p>
              <p className="mt-1 text-sm text-gray-600">오프라인 현지 프로모션 참여 횟수</p>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">해외환자 매출</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{formatRevenue(currentData.revenue)}</p>
              <p className="mt-1 text-sm text-gray-600">선택 월 기준 해외 환자 매출</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
