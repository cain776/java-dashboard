import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { FilterBar } from '@/components/filters/FilterBar'
import { useFilterBar } from '@/components/filters/useFilterBar'
import { MONTHS } from '@/constants/chart'
import { formatAxisNumber, formatAxisPercent, periodLabel, type Period } from '@/utils/stats'
import { statsApi, type SurgeryMonthlyItem } from '@/api/stats'

type SurgeryKey =
  | 'lasek'
  | 'lasik'
  | 'smile'
  | 'smilePro'
  | 'icl'
  | 'tIcl'
  | 'kpl'
  | 'tKpl'
  | 'viva'
  | 'catMulti'
  | 'catMono'
  | 'catEdof'

type FamilyKey = 'refractive' | 'implant' | 'cataract'

type MonthlyData = Record<SurgeryKey, number>

const SURGERY_TYPES: {
  key: SurgeryKey
  label: string
  family: FamilyKey
  color: string
}[] = [
  { key: 'lasek', label: '라섹', family: 'refractive', color: 'var(--chart-1)' },
  { key: 'lasik', label: '라식', family: 'refractive', color: '#3b82f6' },
  { key: 'smile', label: '스마일', family: 'refractive', color: 'var(--chart-3)' },
  { key: 'smilePro', label: '스마일프로', family: 'refractive', color: '#fb7185' },
  { key: 'icl', label: 'ICL', family: 'implant', color: 'var(--chart-4)' },
  { key: 'tIcl', label: 'T-ICL', family: 'implant', color: '#f59e0b' },
  { key: 'kpl', label: 'KPL', family: 'implant', color: '#10b981' },
  { key: 'tKpl', label: 'T-KPL', family: 'implant', color: '#14b8a6' },
  { key: 'viva', label: 'VIVA', family: 'implant', color: '#8b5cf6' },
  { key: 'catMulti', label: '백내장(다초점)', family: 'cataract', color: '#f97316' },
  { key: 'catMono', label: '백내장(단초점)', family: 'cataract', color: '#64748b' },
  { key: 'catEdof', label: '백내장(연속초점)', family: 'cataract', color: '#ef4444' },
]

const FAMILY_META: Record<FamilyKey, { label: string; color: string }> = {
  refractive: { label: '굴절교정', color: 'var(--chart-1)' },
  implant: { label: '렌즈삽입/특수', color: 'var(--chart-4)' },
  cataract: { label: '백내장', color: '#f97316' },
}

const barConfig = Object.fromEntries(
  SURGERY_TYPES.map((type) => [
    type.key,
    {
      label: type.label,
      color: type.color,
    },
  ]),
) satisfies ChartConfig

const familyConfig = Object.fromEntries(
  Object.entries(FAMILY_META).map(([key, value]) => [
    key,
    {
      label: value.label,
      color: value.color,
    },
  ]),
) satisfies ChartConfig

const EMPTY_DATA: MonthlyData = {
  lasek: 0, lasik: 0, smile: 0, smilePro: 0,
  icl: 0, tIcl: 0, kpl: 0, tKpl: 0, viva: 0,
  catMulti: 0, catMono: 0, catEdof: 0,
}

/** API 응답 → 연도별 월간 데이터 맵 변환 */
function toYearMap(items: SurgeryMonthlyItem[]): Record<number, MonthlyData[]> {
  const result: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!result[item.year]) {
      result[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY_DATA }))
    }
    result[item.year][item.month - 1] = {
      lasek: item.lasek, lasik: item.lasik, smile: item.smile, smilePro: item.smilePro,
      icl: item.icl, tIcl: item.tIcl, kpl: item.kpl, tKpl: item.tKpl, viva: item.viva,
      catMulti: item.catMulti, catMono: item.catMono, catEdof: item.catEdof,
    }
  }
  return result
}

export function SurgeryRatioPage() {
  const filter = useFilterBar()

  const requestedYears = useMemo(() => {
    if (filter.mode === 'month') {
      return [...new Set(filter.periods.map((p) => p.year))].sort()
    }
    return [...filter.years].sort()
  }, [filter.mode, filter.periods, filter.years])

  const { data: apiItems, isLoading } = useQuery({
    queryKey: ['surgery-ratio', requestedYears],
    queryFn: () => statsApi.getSurgeryRatio(requestedYears),
    enabled: requestedYears.length > 0,
  })

  const apiData = useMemo(() => (apiItems ? toYearMap(apiItems) : {}), [apiItems])

  /* ── 데이터 접근 헬퍼 ── */
  const pData = (p: Period) => apiData[p.year]?.[p.month] ?? EMPTY_DATA
  const yearSumData = (year: number): MonthlyData => {
    const ms = apiData[year] ?? []
    const r = { ...EMPTY_DATA }
    for (const m of ms) for (const k of SURGERY_TYPES) r[k.key] += m[k.key]
    return r
  }

  // 기준 데이터 (첫 번째 기간)
  const selectedData = filter.mode === 'month' ? pData(filter.periods[0]) : yearSumData(filter.years[0])

  const totalCases = useMemo(
    () => Object.values(selectedData).reduce((sum, value) => sum + value, 0),
    [selectedData],
  )

  const shareData = useMemo(
    () =>
      SURGERY_TYPES.map((type) => ({
        key: type.key,
        name: type.label,
        value: selectedData[type.key],
        share: totalCases ? Number(((selectedData[type.key] / totalCases) * 100).toFixed(1)) : 0,
        fill: type.color,
      })).sort((left, right) => right.value - left.value),
    [selectedData, totalCases],
  )

  const familyShareData = useMemo(
    () =>
      Object.entries(FAMILY_META).map(([familyKey, meta]) => {
        const value = SURGERY_TYPES.filter((type) => type.family === familyKey).reduce(
          (sum, type) => sum + selectedData[type.key],
          0,
        )

        return {
          key: familyKey,
          name: meta.label,
          value,
          fill: meta.color,
        }
      }),
    [selectedData],
  )

  const topTrendKeys = useMemo(
    () => shareData.slice(0, 4).map((item) => item.key),
    [shareData],
  )

  const topTrendConfig = useMemo(
    () =>
      Object.fromEntries(
        topTrendKeys.map((key) => {
          const type = SURGERY_TYPES.find((item) => item.key === key)
          return [
            key,
            {
              label: type?.label ?? key,
              color: type?.color ?? 'var(--chart-1)',
            },
          ]
        }),
      ) satisfies ChartConfig,
    [topTrendKeys],
  )

  const trendYear = filter.mode === 'month' ? filter.periods[0].year : filter.years[0]

  const trendData = useMemo(
    () =>
      MONTHS.map((month, monthIndex) => {
        const row: Record<string, string | number> = { month }
        topTrendKeys.forEach((key) => {
          row[key] = apiData[trendYear]?.[monthIndex]?.[key] ?? 0
        })
        return row
      }),
    [trendYear, topTrendKeys, apiData],
  )

  const topSurgery = shareData[0]
  const premiumShare = shareData
    .filter((item) => ['smile', 'smilePro', 'icl', 'tIcl', 'viva'].includes(item.key))
    .reduce((sum, item) => sum + item.share, 0)
  const cataractTotal = shareData
    .filter((item) => item.key.startsWith('cat'))
    .reduce((sum, item) => sum + item.value, 0)
  const premiumCataractShare = cataractTotal
    ? Number(
        (
          ((selectedData.catMulti + selectedData.catEdof) / cataractTotal) *
          100
        ).toFixed(1),
      )
    : 0
  const lensMixShare = totalCases
    ? Number(
        (
          ((selectedData.icl + selectedData.tIcl + selectedData.kpl + selectedData.tKpl + selectedData.viva) /
            totalCases) *
          100
        ).toFixed(1),
      )
    : 0

  const baseLabel = filter.mode === 'month' ? periodLabel(filter.periods[0]) : `${filter.years[0]}년`

  if (isLoading && Object.keys(apiData).length === 0) {
    return (
      <div className="space-y-6">
        <FilterBar {...filter} />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          데이터를 불러오는 중...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── 필터 바 ── */}
      <FilterBar {...filter} />

      {/* ── KPI 카드 ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-2 border-border/70 shadow-sm">
          <CardHeader className="gap-0.5 pb-0">
            <CardTitle className="text-base font-semibold text-gray-900">전체 수술 볼륨</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold tracking-tight text-gray-900">{totalCases.toLocaleString()}건</p>
            <p className="text-sm text-muted-foreground">{baseLabel} 기준</p>
          </CardContent>
        </Card>

        <Card className="gap-2 border-border/70 shadow-sm">
          <CardHeader className="gap-0.5 pb-0">
            <CardTitle className="text-base font-semibold text-gray-900">최대 비중 수술</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold tracking-tight text-gray-900">{topSurgery?.name ?? '-'}</p>
            <p className="text-sm text-muted-foreground">{topSurgery?.share.toFixed(1) ?? '0.0'}% 비중</p>
          </CardContent>
        </Card>

        <Card className="gap-2 border-border/70 shadow-sm">
          <CardHeader className="gap-0.5 pb-0">
            <CardTitle className="text-base font-semibold text-gray-900">프리미엄 수술 비중</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold tracking-tight text-gray-900">{premiumShare.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">스마일/스마일프로/ICL/VIVA 합산</p>
          </CardContent>
        </Card>

        <Card className="gap-2 border-border/70 shadow-sm">
          <CardHeader className="gap-0.5 pb-0">
            <CardTitle className="text-base font-semibold text-gray-900">백내장 프리미엄 렌즈 비중</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold tracking-tight text-gray-900">{premiumCataractShare.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">다초점·연속초점 렌즈 기준</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>수술 유형별 점유율</CardTitle>
            <CardDescription>{baseLabel} 기준 수술 유형별 비중을 비교합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[460px] w-full">
              <BarChart data={shareData} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickFormatter={formatAxisPercent} />
                <YAxis dataKey="name" type="category" width={120} tickLine={false} axisLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent formatter={(_, name, item) => `${Number(item?.payload?.share ?? 0).toFixed(1)}%`} />}
                />
                <Bar dataKey="share" radius={8} barSize={18}>
                  {shareData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>수술군 포트폴리오</CardTitle>
            <CardDescription>굴절교정, 렌즈삽입, 백내장 비중을 크게 봅니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ChartContainer config={familyConfig} className="mx-auto h-72 w-full max-w-[320px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={familyShareData}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={66}
                  outerRadius={96}
                  paddingAngle={4}
                  strokeWidth={3}
                >
                  {familyShareData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="space-y-2 text-sm">
              {familyShareData.map((entry) => (
                <div key={entry.key} className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                  <span>{entry.name}</span>
                  <span className="ml-auto font-medium text-foreground">
                    {totalCases ? ((entry.value / totalCases) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">렌즈 기반 수술 비중</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{lensMixShare.toFixed(1)}%</p>
              <p className="mt-1 text-sm text-gray-600">ICL, T-ICL, KPL, T-KPL, VIVA 합산</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>상위 수술 월별 추이</CardTitle>
          <CardDescription>{trendYear}년 기준 상위 4개 수술의 월별 추이입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={topTrendConfig} className="h-80 w-full">
            <LineChart data={trendData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
              <ChartLegend content={<ChartLegendContent />} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {topTrendKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={`var(--color-${key})`}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
