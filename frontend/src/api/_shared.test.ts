import { describe, expect, it } from 'vitest'

import { buildQuery, withQuery } from './_shared'

describe('api query helpers', () => {
  it('nullish 값은 제외하고 배열은 comma-separated 값으로 만든다', () => {
    expect(buildQuery({ years: [2025, 2026], mock: true, empty: null, skip: undefined })).toBe(
      'years=2025%2C2026&mock=true',
    )
  })

  it('쿼리가 없으면 path만 반환한다', () => {
    expect(withQuery('/stats/reservation', { from: null, to: undefined })).toBe('/stats/reservation')
  })

  it('문자열 값은 URLSearchParams 규칙으로 인코딩한다', () => {
    expect(withQuery('/stats/cataract-reservation-rate/trend', { category: '40대 이상' })).toBe(
      '/stats/cataract-reservation-rate/trend?category=40%EB%8C%80+%EC%9D%B4%EC%83%81',
    )
  })
})
