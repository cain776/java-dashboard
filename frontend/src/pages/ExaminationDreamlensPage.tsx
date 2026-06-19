import { ExaminationMetricTrend } from '@/components/stats/ExaminationMetricTrend'

/** 검사 > 드림렌즈 검사건수. 렌즈센터 D 기준(사람 단위), 전 기간 운영 DB 집계. */
export function ExaminationDreamlensPage() {
  return (
    <ExaminationMetricTrend
      metric="dreamlens"
      description="드림렌즈 검사(렌즈센터 D 기준, 사람 단위) 건수입니다. 전 기간 운영 DB 라이브 집계입니다."
    />
  )
}
