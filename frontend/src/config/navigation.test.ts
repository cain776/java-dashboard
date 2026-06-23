import { describe, expect, it } from 'vitest'

import { isMenuHidden, menuItems, statsPages } from './navigation'

const menuPaths = () =>
  menuItems.flatMap((item) =>
    item.children?.map((child) => child.href) ?? (item.href === '#' ? [] : [item.href]),
  )

describe('navigation menu', () => {
  it('statsPages에 정의된 모든 통계 페이지는 메뉴에 노출 경로가 있어야 한다(숨김 메뉴 제외)', () => {
    const paths = menuPaths()

    expect(
      statsPages
        .filter((page) => !isMenuHidden(page.id))
        .map((page) => page.path)
        .filter((path) => !paths.includes(path)),
    ).toEqual([])
  })

  it('숨김 메뉴(유입·예약 건수)는 사이드바에 노출되지 않는다', () => {
    const paths = menuPaths()

    expect(paths).not.toContain('/stats/intake-conversion')
    expect(paths).not.toContain('/stats/reservation')
  })

  it('메뉴의 통계 링크는 statsPages에 정의된 경로만 사용해야 한다', () => {
    const statsPagePaths = statsPages.map((page) => page.path)
    const linkedStatsPaths = menuPaths().filter((path) => path.startsWith('/stats') || path.startsWith('/report'))

    expect(linkedStatsPaths.filter((path) => !statsPagePaths.includes(path))).toEqual([])
  })
})
