import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import { AppLayout } from './components/layout/AppLayout'
import { statsPages } from './config/navigation'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { StatsPlaceholderPage } from './pages/StatsPlaceholderPage'
import { requireAuth } from './auth-guard'
import { PAGE_COMPONENTS, isRouteBlocked } from './pages/pageRegistry'

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
  beforeLoad: requireAuth,
  component: AppLayout,
})

// Dashboard (index)
const dashboardRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/',
  component: DashboardPage,
})

// 운영 빌드(PROD)에서는 pending(미완성) 페이지의 라우트를 차단한다(직접 URL 접근도 placeholder).
const isProd = !import.meta.env.DEV

// 통계 페이지 라우트는 navigation.ts 정의로부터 자동 생성한다.
// 레지스트리에 컴포넌트가 있고 차단 대상이 아니면 전용 페이지, 아니면 StatsPlaceholderPage.
const statsRoutes = statsPages.map((page) => {
  const fallback = () => <StatsPlaceholderPage page={page} />
  const blocked = isRouteBlocked(page.id, isProd)
  const component = blocked ? fallback : (PAGE_COMPONENTS[page.id] ?? fallback)
  return createRoute({
    getParentRoute: () => authLayout,
    path: page.path,
    component,
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
