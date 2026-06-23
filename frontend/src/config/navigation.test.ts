import { describe, expect, it } from 'vitest'

import { menuItems, statsPages } from './navigation'

const menuPaths = () =>
  menuItems.flatMap((item) =>
    item.children?.map((child) => child.href) ?? (item.href === '#' ? [] : [item.href]),
  )

describe('navigation menu', () => {
  it('statsPages에 정의된 모든 통계 페이지는 메뉴에 노출 경로가 있어야 한다', () => {
    const paths = menuPaths()

    expect(statsPages.map((page) => page.path).filter((path) => !paths.includes(path))).toEqual([])
  })

  it('메뉴의 통계 링크는 statsPages에 정의된 경로만 사용해야 한다', () => {
    const statsPagePaths = statsPages.map((page) => page.path)
    const linkedStatsPaths = menuPaths().filter((path) => path.startsWith('/stats') || path.startsWith('/report'))

    expect(linkedStatsPaths.filter((path) => !statsPagePaths.includes(path))).toEqual([])
  })
})
