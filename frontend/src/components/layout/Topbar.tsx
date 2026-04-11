import { useAuthStore } from '../../stores/authStore'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { statsPages } from '@/config/navigation'

export function Topbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const displayName = user?.name || user?.loginId || user?.email

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
