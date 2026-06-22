import { describe, it, expect } from 'vitest'
import { PAGE_COMPONENTS, isRouteBlocked } from './pageRegistry'
import { statsPages, getMenuStatus } from '../config/navigation'

/**
 * 통계 페이지 라우트 정책 불변식 가드.
 *
 * 정책: "개발(DEV)에는 페이지가 존재하지만 운영(PROD)에서는 숨김/차단".
 * pending 페이지는 WIP 컴포넌트가 도메인 레지스트리에 등록돼 있어도 운영에선 placeholder로 막힌다.
 * 이 테스트는 그 의미가 상태 드리프트(예: 미완성 페이지를 'complete'로 잘못 변경)로 깨지는 것을 막는다.
 */
describe('통계 페이지 라우트 정책 불변식', () => {
  const ids = statsPages.map((p) => p.id)
  const liveIds = ids.filter((id) => getMenuStatus(id) !== 'pending')
  const pendingIds = ids.filter((id) => getMenuStatus(id) === 'pending')

  it('complete/backend-only 페이지는 도메인 레지스트리에 컴포넌트가 등록돼 있어야 한다', () => {
    // 'complete'로 표시됐는데 컴포넌트가 없으면 운영에서 빈 placeholder가 노출됨 → 금지.
    const missing = liveIds.filter((id) => !PAGE_COMPONENTS[id])
    expect(missing).toEqual([])
  })

  it('pending 페이지는 운영(PROD)에서 차단되고 개발(DEV)에서는 허용된다', () => {
    expect(pendingIds.length).toBeGreaterThan(0)
    for (const id of pendingIds) {
      expect(isRouteBlocked(id, true)).toBe(true) // 운영: 차단(placeholder)
      expect(isRouteBlocked(id, false)).toBe(false) // 개발: WIP 미리보기 허용
    }
  })

  it('완료(live) 페이지는 운영에서도 차단되지 않는다', () => {
    for (const id of liveIds) {
      expect(isRouteBlocked(id, true)).toBe(false)
    }
  })

  it('statsPages id는 중복이 없어야 한다', () => {
    expect(new Set(ids).size).toBe(ids.length)
  })
})
