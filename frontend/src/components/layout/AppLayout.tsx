import { useState } from 'react'
import { Outlet } from '@tanstack/react-router'
import { Database, Menu, Server, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDataSourceStore } from '@/stores/dataSourceStore'

export function AppLayout() {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { source, toggle: toggleSource } = useDataSourceStore()
  const isMock = source === 'mock'

  /* ── 모바일 ── */
  if (isMobile) {
    return (
      <div className="flex h-screen flex-col">
        {/* 모바일 헤더 */}
        <header className="flex h-12 flex-shrink-0 items-center border-b border-gray-200 bg-white px-4">
          <button type="button" onClick={() => setDrawerOpen(true)} className="rounded-lg p-1.5 hover:bg-gray-100">
            <Menu className="h-5 w-5 text-gray-700" />
          </button>
          <span className="ml-3 text-sm font-bold text-gray-900">Analytics &amp; KPI</span>
          <button
            type="button"
            onClick={toggleSource}
            className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
              isMock
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {isMock ? <Database className="h-3 w-3" /> : <Server className="h-3 w-3" />}
            {isMock ? '더미' : '리얼'}
          </button>
        </header>

        {/* 드로어 오버레이 */}
        {drawerOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setDrawerOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-[260px] bg-white shadow-xl">
              <div className="flex h-12 items-center justify-between border-b border-gray-200 px-4">
                <span className="text-sm font-bold text-gray-900">메뉴</span>
                <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              <Sidebar collapsed={false} onToggleSidebar={() => setDrawerOpen(false)} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </>
        )}

        {/* 컨텐츠 */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <Outlet />
        </main>
      </div>
    )
  }

  /* ── 데스크톱 ── */
  return (
    <div className="flex h-screen">
      <Sidebar collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => { const next = !c; localStorage.setItem('sidebar-collapsed', String(next)); return next })} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
