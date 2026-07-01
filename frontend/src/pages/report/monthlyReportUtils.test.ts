import { describe, expect, it } from 'vitest'

import { applyCurrentYearBase, mergeMonthlySeries } from './monthlyReportUtils'

describe('monthlyReportUtils', () => {
  it('PDF 기준값이 있으면 live 값으로 덮어쓰지 않는다', () => {
    expect(
      mergeMonthlySeries(
        [2425, 1892, null],
        [2410, 1902, 1301],
      ).slice(0, 3),
    ).toEqual([2425, 1892, 1301])
  })

  it('당해연도만 PDF 기준값으로 병합하고 다른 연도는 그대로 둔다', () => {
    const data = {
      2025: [100, 101, 102, null],
      2026: [10, 20, 30, 40],
    }

    const merged = applyCurrentYearBase(data, 2026, [1, null, 3, null])

    expect(merged[2025]).toBe(data[2025])
    expect(merged[2026].slice(0, 4)).toEqual([1, 20, 3, 40])
  })
})
