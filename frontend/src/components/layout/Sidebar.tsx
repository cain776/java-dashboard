import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import {
  menuItems,
  type MenuLink,
  type MenuStatus,
} from '@/config/navigation'

const getOpenMenus = (pathname: string) =>
  new Set(
    menuItems
      .filter((item) => item.children?.some((child) => child.href === pathname))
      .map((item) => item.id)
  )

// 운영 빌드에서 pending 메뉴 숨김
const isProd = !import.meta.env.DEV
const isDisabled = (status?: MenuStatus) => isProd && status === 'pending'

// 구현 상태별 텍스트 색상 (활성 상태가 아닐 때만 적용)
const statusTextClass = (status?: MenuStatus): string => {
  if (isDisabled(status)) return 'text-gray-300 pointer-events-none cursor-default'
  if (status === 'pending') return 'text-red-500 hover:text-red-600'
  if (status === 'backend-only') return 'text-amber-600 hover:text-amber-700'
  return 'text-gray-500 hover:text-gray-900'
}

const childLinkClassName = (isActive: boolean, status?: MenuStatus) =>
  `block rounded-md px-2.5 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-blue-50 font-medium text-blue-600'
      : `${statusTextClass(status)} hover:bg-gray-50`
  }`

function SidebarChildLinks({
  children,
  pathname,
  onNavigate,
}: {
  children: MenuLink[]
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <>
      {children.map((child) => (
        <li key={child.href}>
          <Link
            to={child.href}
            onClick={onNavigate}
            className={childLinkClassName(pathname === child.href, child.status)}
          >
            {child.label}
          </Link>
        </li>
      ))}
    </>
  )
}

export function Sidebar({ collapsed, onToggleSidebar, onNavigate }: { collapsed: boolean; onToggleSidebar: () => void; onNavigate?: () => void }) {
  const location = useLocation()
  const [openMenus, setOpenMenus] = useState<Set<string>>(() => {
    try { const saved = localStorage.getItem('sidebar-open-menus'); return saved ? new Set(JSON.parse(saved)) : new Set() }
    catch { return new Set() }
  })
  const activeMenus = getOpenMenus(location.pathname)

  const toggleMenu = (id: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem('sidebar-open-menus', JSON.stringify([...next]))
      return next
    })
  }

  const isOpen = (id: string) => openMenus.has(id) || activeMenus.has(id)

  return (
    <aside
      className={`bg-white border-r border-gray-200 h-full flex flex-col transition-all duration-200 ${collapsed ? 'w-16' : 'w-[200px]'} flex-shrink-0`}
    >
      <div className={`h-14 min-h-14 flex items-center border-b border-gray-200 px-3 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <span className="text-base font-bold text-gray-900">Analytics &amp; KPI</span>}
        <button type="button" title="메뉴 접기/펼치기" onClick={onToggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const children = item.children ?? []
            const hasChildren = children.length > 0
            const isActive = hasChildren
              ? children.some((child) => child.href === location.pathname)
              : location.pathname === item.href

            return (
              <li key={item.id} className="relative">
                {hasChildren ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleMenu(item.id)}
                      aria-expanded={isOpen(item.id)}
                      aria-haspopup={collapsed ? 'menu' : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center w-full rounded-lg text-sm font-medium transition-colors
                        ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-100'}
                        ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}`}
                    >
                      <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          <ChevronDown
                            className={`h-4 w-4 text-gray-400 transition-transform ${isOpen(item.id) ? 'rotate-180' : ''}`}
                          />
                        </>
                      )}
                    </button>
                    {!collapsed && isOpen(item.id) && (
                      <ul className="mt-1 space-y-0.5 ml-[15px] border-l border-gray-200 pl-4">
                        <SidebarChildLinks
                          children={children}
                          pathname={location.pathname}
                          onNavigate={onNavigate}
                        />
                      </ul>
                    )}
                    {collapsed && isOpen(item.id) && (
                      <div className="absolute left-full top-0 z-30 ml-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                        <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                          {item.label}
                        </div>
                        <ul className="space-y-1">
                          <SidebarChildLinks
                            children={children}
                            pathname={location.pathname}
                          />
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center rounded-lg text-sm font-medium transition-colors
                      ${isActive
                        ? 'text-blue-600 bg-blue-50'
                        : `${statusTextClass(item.status) || 'text-gray-700'} hover:bg-gray-100`}
                      ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}`}
                  >
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-100 text-xs text-gray-400">
        {!collapsed && <span>&copy; 2026 B&VIIT Group</span>}
      </div>
    </aside>
  )
}
