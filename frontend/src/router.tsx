import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from '@tanstack/react-router'
import type { FC } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { statsPages } from './config/navigation'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { StatsPlaceholderPage } from './pages/StatsPlaceholderPage'
import { readStoredAuthSession } from './stores/auth-session'
import { reportPageRoutes } from './pages/report/routes'
import { overallPageRoutes } from './pages/overall/routes'
import { reservationPageRoutes } from './pages/reservation/routes'
import { examPageRoutes } from './pages/exam/routes'
import { consultationPageRoutes } from './pages/consultation/routes'
import { surgeryPageRoutes } from './pages/surgery/routes'
import { outpatientPageRoutes } from './pages/outpatient/routes'
import { marketingPageRoutes } from './pages/marketing/routes'
import { cancelNoshowPageRoutes } from './pages/cancel-noshow/routes'
import { unitPricePageRoutes } from './pages/unit-price/routes'
import { etcPageRoutes } from './pages/etc/routes'

// 도메인별 페이지 컴포넌트 레지스트리 — 각 pages/<domain>/routes.ts 가 자기 도메인을 소유.
// 새 페이지 연결 = navigation.ts에 정의 + 해당 도메인 routes.ts에 한 줄 추가 (router.tsx 수정 불필요).
const PAGE_COMPONENTS: Record<string, FC> = {
  ...reportPageRoutes,
  ...overallPageRoutes,
  ...reservationPageRoutes,
  ...examPageRoutes,
  ...consultationPageRoutes,
  ...surgeryPageRoutes,
  ...outpatientPageRoutes,
  ...marketingPageRoutes,
  ...cancelNoshowPageRoutes,
  ...unitPricePageRoutes,
  ...etcPageRoutes,
}

// Root
const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// Login (public)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

// Authenticated layout
const authLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  beforeLoad: () => {
    const { token } = readStoredAuthSession()
    if (!token) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

// Dashboard (index)
const dashboardRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/',
  component: DashboardPage,
})

// 통계 페이지 라우트는 navigation.ts 정의로부터 자동 생성한다.
// 도메인 레지스트리에 컴포넌트가 있으면 전용 페이지, 없으면 StatsPlaceholderPage.
const statsRoutes = statsPages.map((page) => {
  const PageComponent = PAGE_COMPONENTS[page.id]
  return createRoute({
    getParentRoute: () => authLayout,
    path: page.path,
    component: PageComponent ?? (() => <StatsPlaceholderPage page={page} />),
  })
})

// Route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  authLayout.addChildren([dashboardRoute, ...statsRoutes]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
