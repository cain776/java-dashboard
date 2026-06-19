import { ExaminationMetricTrend } from '@/components/stats/ExaminationMetricTrend'

/** 검사 > 시력교정 검사건수. EXAM 실측(사람 단위, 드림렌즈 제외). */
export function ExaminationVisionPage() {
  return (
    <ExaminationMetricTrend
      metric="visionCorrection"
      description="시력교정 검사(EXAM 실측, 사람 단위, 드림렌즈 제외) 건수입니다. 2024·2025년은 확정값, 2026년부터는 운영 DB 집계입니다."
    />
  )
}
