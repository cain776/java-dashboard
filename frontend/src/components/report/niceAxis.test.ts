import { describe, expect, it } from 'vitest'

import { niceAxis, niceAxisFor, niceStep } from './niceAxis'

describe('niceStep', () => {
  it('범위를 1·2·5·10×10ⁿ nice step으로 환산', () => {
    expect(niceStep(61)).toBe(20) // 백내장 수술 범위
    expect(niceStep(2057)).toBe(500) // 외래수 범위
    expect(niceStep(4)).toBe(1) // 중단율 범위(%)
    expect(niceStep(31)).toBe(10) // 백내장 예약률 범위(%)
  })

  it('0 이하 범위는 1', () => {
    expect(niceStep(0)).toBe(1)
    expect(niceStep(-5)).toBe(1)
  })
})

describe('niceAxis', () => {
  it('작은 카운트(백내장 수술)는 0~120으로 떨어진다', () => {
    const { domain, ticks } = niceAxis([90, 67, 69, 42, 61, 36, 97])
    expect(domain).toEqual([0, 120])
    expect(ticks).toEqual([0, 20, 40, 60, 80, 100, 120])
  })

  it('큰 카운트(외래수)는 0이 아닌 baseline에서 시작(3000~6000)', () => {
    const { domain } = niceAxis([4822, 4339, 4247, 3653, 5389, 3332])
    expect(domain).toEqual([3000, 6000])
  })

  it('비율도 음수 없이 깔끔하게(중단율 0~9)', () => {
    const { domain } = niceAxis([4.4, 6, 7, 8, 5])
    expect(domain[0]).toBe(0)
    expect(domain[1]).toBe(9)
  })

  it('높고 촘촘한 비율(백내장 예약률)은 음수 없이 baseline 상향', () => {
    const { domain } = niceAxis([49, 80, 64, 56, 55])
    expect(domain[0]).toBeGreaterThanOrEqual(0)
    expect(domain[0]).toBeLessThan(50)
    expect(domain[1]).toBeGreaterThanOrEqual(80)
  })

  it('어떤 입력도 하한이 음수가 되지 않는다', () => {
    expect(niceAxis([36, 97]).domain[0]).toBeGreaterThanOrEqual(0)
    expect(niceAxis([1, 2, 3]).domain[0]).toBeGreaterThanOrEqual(0)
  })

  it('값이 없으면 [0,1]', () => {
    expect(niceAxis([]).domain).toEqual([0, 1])
    expect(niceAxis([null, undefined]).domain).toEqual([0, 1])
  })
})

describe('niceAxisFor (명시 범위 고정)', () => {
  it('예약종합 [800,3000] → 끝값은 그대로, 사이는 1000·1500·…·3000', () => {
    const { domain, ticks } = niceAxisFor(800, 3000)
    expect(domain).toEqual([800, 3000])
    expect(ticks).toEqual([1000, 1500, 2000, 2500, 3000]) // 3500 없음
  })

  it('상한을 넘는 눈금은 만들지 않는다', () => {
    const { ticks } = niceAxisFor(800, 3000)
    expect(Math.max(...ticks)).toBeLessThanOrEqual(3000)
  })
})
