/**
 * 데이터 스케일에 맞춘 Y축 도메인·눈금 계산 (월간보고 PDF/Excel처럼 깔끔하게).
 * - 음수 금지(카운트·비율 모두 ≥0)
 * - 데이터 범위에 비례한 여백 + nice-number 반올림 → 눈금이 0·20·40… 처럼 떨어짐
 * - 데이터가 0에 가까우면 0부터, 높고 촘촘하면 비례 baseline부터(Excel 거동 근사)
 */

/** 범위를 1·2·5·10×10ⁿ 중 ~5등분에 가까운 nice step으로 환산. */
export function niceStep(range: number): number {
  if (!(range > 0)) return 1
  const rough = range / 5
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const norm = rough / mag
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return factor * mag
}

export interface Axis {
  domain: [number, number]
  ticks: number[]
}

/** [하한, 상한] 사이를 nice step 눈금으로 채운다(공용). */
function ticksBetween(bottom: number, top: number, step: number): number[] {
  const ticks: number[] = []
  const start = Math.ceil(bottom / step) * step
  for (let t = start; t <= top + step * 1e-6; t += step) {
    ticks.push(Number(t.toFixed(6)))
  }
  return ticks
}

/** 값 배열에서 [하한, 상한] 도메인과 눈금 배열을 만든다. 값이 없으면 [0,1]. */
export function niceAxis(values: Array<number | null | undefined>): Axis {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (!nums.length) return { domain: [0, 1], ticks: [0, 1] }

  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const span = max - min || Math.abs(max) || 1
  const step = niceStep(span)
  const pad = span * 0.15

  const top = Math.ceil((max + pad) / step) * step
  // 데이터가 0에 충분히 가까우면 0부터, 높고 촘촘하면(min ≥ max·0.6) 여백만큼 내린 nice floor. 음수 금지.
  const bottom = min < max * 0.6 ? 0 : Math.max(0, Math.floor((min - pad) / step) * step)

  return { domain: [bottom, top], ticks: ticksBetween(bottom, top, step) }
}

/**
 * 명시한 [min, max] 범위로 축을 고정한다(예약종합처럼 범위가 안정적인 차트용).
 * 도메인 끝은 그대로 두고 그 사이를 nice step 눈금으로 채운다(예: [800,3000] → 1000·1500·…·3000).
 */
export function niceAxisFor(min: number, max: number): Axis {
  const step = niceStep(max - min)
  return { domain: [min, max], ticks: ticksBetween(min, max, step) }
}
