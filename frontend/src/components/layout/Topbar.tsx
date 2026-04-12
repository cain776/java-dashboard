import { useAuthStore } from '../../stores/authStore'
import { useDataSourceStore } from '../../stores/dataSourceStore'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { statsPages } from '@/config/navigation'
import { Database, Server } from 'lucide-react'

export function Topbar() {
  const { user, logout } = useAuthStore()
  const { source, toggle } = useDataSourceStore()
  const navigate = useNavigate()
  const location = useLocation()
  const displayName = user?.name || user?.loginId || user?.email
  const isMock = source === 'mock'

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  const currentPage = statsPages.find((p) => p.path === location.pathname)

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
      {currentPage ? (
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-gray-400">{currentPage.sectionLabel}</span>
          <span className="text-gray-300">&gt;</span>
          <span className="text-gray-900 font-semibold">{currentPage.label}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <span className="px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium rounded">
            통계 대시보드
          </span>
          <span className="text-gray-400">병원 경영 핵심 지표를 한눈에 확인하세요</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        {/* 데이터소스 토글 */}
        <button
          type="button"
          onClick={toggle}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            isMock
              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
          title={isMock ? '더미 데이터 사용 중 — 클릭하여 리얼 전환' : '리얼 데이터 사용 중 — 클릭하여 더미 전환'}
        >
          {isMock ? <Database className="h-3 w-3" /> : <Server className="h-3 w-3" />}
          {isMock ? '더미' : '리얼'}
        </button>

        {displayName && <span className="text-sm text-gray-600">{displayName}</span>}
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700"
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}
