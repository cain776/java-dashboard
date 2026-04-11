import { TrendingDown, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatAxisNumber } from '@/utils/stats'

const monthlySurgery = [
  { month: '1월', lasik: 45, lasek: 38, smile: 28, icl: 15 },
  { month: '2월', lasik: 52, lasek: 42, smile: 32, icl: 18 },
  { month: '3월', lasik: 48, lasek: 35, smile: 30, icl: 16 },
  { month: '4월', lasik: 61, lasek: 48, smile: 38, icl: 22 },
  { month: '5월', lasik: 55, lasek: 44, smile: 36, icl: 20 },
  { month: '6월', lasik: 67, lasek: 52, smile: 42, icl: 25 },
  { month: '7월', lasik: 72, lasek: 58, smile: 48, icl: 28 },
  { month: '8월', lasik: 68, lasek: 55, smile: 45, icl: 26 },
  { month: '9월', lasik: 74, lasek: 60, smile: 50, icl: 30 },
  { month: '10월', lasik: 80, lasek: 65, smile: 55, icl: 34 },
  { month: '11월', lasik: 76, lasek: 62, smile: 52, icl: 32 },
  { month: '12월', lasik: 82, lasek: 68, smile: 58, icl: 36 },
]

const monthlyRevenue = [
  { month: '1월', revenue: 5.2 },
  { month: '2월', revenue: 5.8 },
  { month: '3월', revenue: 5.5 },
  { month: '4월', revenue: 6.4 },
  { month: '5월', revenue: 6.1 },
  { month: '6월', revenue: 7.2 },
  { month: '7월', revenue: 7.8 },
  { month: '8월', revenue: 7.5 },
  { month: '9월', revenue: 8.0 },
  { month: '10월', revenue: 8.5 },
  { month: '11월', revenue: 8.2 },
  { month: '12월', revenue: 8.2 },
]

const surgeryType = [
  { segment: 'lasik', name: '라식', value: 30, fill: 'var(--color-lasik)' },
  { segment: 'lasek', name: '라섹', value: 25, fill: 'var(--color-lasek)' },
  { segment: 'smile', name: '스마일', value: 20, fill: 'var(--color-smile)' },
  { segment: 'icl', name: 'ICL', value: 15, fill: 'var(--color-icl)' },
  { segment: 'lens', name: '렌즈삽입', value: 6, fill: 'var(--color-lens)' },
  { segment: 'other', name: '기타', value: 4, fill: 'var(--color-other)' },
]

const doctorStats = [
  { name: '김원장', count: 85 },
  { name: '이원장', count: 72 },
  { name: '박원장', count: 68 },
  { name: '최원장', count: 55 },
  { name: '정원장', count: 44 },
]

const channelData = [
  { channel: 'naver', name: '네이버', value: 35, fill: 'var(--color-naver)' },
  { channel: 'instagram', name: '인스타그램', value: 22, fill: 'var(--color-instagram)' },
  { channel: 'referral', name: '지인소개', value: 18, fill: 'var(--color-referral)' },
  { channel: 'youtube', name: '유튜브', value: 12, fill: 'var(--color-youtube)' },
  { channel: 'kakao', name: '카카오', value: 8, fill: 'var(--color-kakao)' },
  { channel: 'other', name: '기타', value: 5, fill: 'var(--color-other)' },
]

const stats = [
  { label: '이번달 수술', value: '324', change: '+12%', positive: true },
  { label: '이번달 매출', value: '8.2억', change: '+8%', positive: true },
  { label: '이번달 예약', value: '1,247', change: '-3%', positive: false },
  { label: '신규 환자', value: '186', change: '+15%', positive: true },
]

const surgeryTrendConfig = {
  lasik: { label: '라식', color: 'var(--chart-1)' },
  lasek: { label: '라섹', color: 'var(--chart-2)' },
  smile: { label: '스마일', color: 'var(--chart-3)' },
  icl: { label: 'ICL', color: 'var(--chart-4)' },
} satisfies ChartConfig

const revenueConfig = {
  revenue: { label: '매출(억원)', color: 'var(--chart-5)' },
} satisfies ChartConfig

const surgeryTypeConfig = {
  lasik: { label: '라식', color: 'var(--chart-1)' },
  lasek: { label: '라섹', color: 'var(--chart-2)' },
  smile: { label: '스마일', color: 'var(--chart-3)' },
  icl: { label: 'ICL', color: 'var(--chart-4)' },
  lens: { label: '렌즈삽입', color: '#f59e0b' },
  other: { label: '기타', color: '#94a3b8' },
} satisfies ChartConfig

const doctorConfig = {
  count: { label: '수술건수', color: 'var(--chart-1)' },
} satisfies ChartConfig

const channelConfig = {
  naver: { label: '네이버', color: 'var(--chart-5)' },
  instagram: { label: '인스타그램', color: 'var(--chart-2)' },
  referral: { label: '지인소개', color: 'var(--chart-1)' },
  youtube: { label: '유튜브', color: '#f97316' },
  kakao: { label: '카카오', color: '#eab308' },
  other: { label: '기타', color: '#94a3b8' },
} satisfies ChartConfig

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const TrendIcon = stat.positive ? TrendingUp : TrendingDown

          return (
            <Card key={stat.label} className="border-border/70 shadow-sm">
              <CardHeader className="gap-2">
                <CardDescription>{stat.label}</CardDescription>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-3xl font-semibold tracking-tight text-gray-900">
                    {stat.value}
                  </CardTitle>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      stat.positive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    <TrendIcon className="h-3.5 w-3.5" />
                    {stat.change}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">전월 대비 변화량</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>월별 수술 추이</CardTitle>
            <CardDescription>수술 종류별 월간 실적 비교</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={surgeryTrendConfig} className="h-80 w-full">
              <BarChart data={monthlySurgery}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                <Bar dataKey="lasik" stackId="surgery" fill="var(--color-lasik)" radius={[0, 0, 6, 6]} />
                <Bar dataKey="lasek" stackId="surgery" fill="var(--color-lasek)" />
                <Bar dataKey="smile" stackId="surgery" fill="var(--color-smile)" />
                <Bar dataKey="icl" stackId="surgery" fill="var(--color-icl)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>월별 매출 추이</CardTitle>
            <CardDescription>누적 성장 흐름을 월 단위로 확인합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="h-80 w-full">
              <AreaChart data={monthlyRevenue} margin={{ left: 12, right: 12 }}>
                <defs>
                  <linearGradient id="fill-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatAxisNumber}
                  width={60}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${Number(value).toFixed(1)}억`}
                    />
                  }
                />
                <Area
                  dataKey="revenue"
                  type="monotone"
                  fill="url(#fill-revenue)"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>수술 종류별 비율</CardTitle>
            <CardDescription>대표 수술 포트폴리오 분포</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer config={surgeryTypeConfig} className="mx-auto h-72 w-full max-w-[320px]">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={surgeryType}
                  dataKey="value"
                  nameKey="segment"
                  innerRadius={68}
                  outerRadius={96}
                  paddingAngle={3}
                  strokeWidth={3}
                >
                  {surgeryType.map((entry) => (
                    <Cell key={entry.segment} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {surgeryType.map((entry) => (
                <div key={entry.segment} className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span>{entry.name}</span>
                  <span className="ml-auto font-medium text-foreground">{entry.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>원장별 수술 실적</CardTitle>
            <CardDescription>이번 달 기준 상위 집도 실적</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={doctorConfig} className="h-72 w-full">
              <BarChart
                accessibilityLayer
                data={doctorStats}
                layout="vertical"
                margin={{ left: 8, right: 8 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={54}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={8}
                  barSize={18}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>환자 유입 채널</CardTitle>
            <CardDescription>이번 달 신규 환자 유입 비중</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChartContainer config={channelConfig} className="mx-auto h-72 w-full max-w-[320px]">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={channelData}
                  dataKey="value"
                  nameKey="channel"
                  innerRadius={64}
                  outerRadius={96}
                  paddingAngle={3}
                  strokeWidth={3}
                >
                  {channelData.map((entry) => (
                    <Cell key={entry.channel} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="space-y-2 text-sm">
              {channelData.map((entry) => (
                <div key={entry.channel} className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span>{entry.name}</span>
                  <span className="ml-auto font-medium text-foreground">{entry.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
