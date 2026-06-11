import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from '@tanstack/react-router'
import { AppLayout } from './components/layout/AppLayout'
import { statsPages } from './config/navigation'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { IntakeConversionPage } from './pages/IntakeConversionPage'
import { ReservationPage } from './pages/ReservationPage'
import { ExaminationPage } from './pages/ExaminationPage'
import { ExamListPage } from './pages/ExamListPage'
import { CataractExamListPage } from './pages/CataractExamListPage'
import { ConsultationRatePage } from './pages/ConsultationRatePage'
import { SurgeryListPage } from './pages/SurgeryListPage'
import { SurgeryPage } from './pages/SurgeryPage'
import { SurgeryRatioPage } from './pages/SurgeryRatioPage'
import { OverseasPage } from './pages/OverseasPage'
import { MarketingPage } from './pages/MarketingPage'
import { CancelRatePage } from './pages/CancelRatePage'
import { NoShowRatePage } from './pages/NoShowRatePage'
import { UnitPricePage } from './pages/UnitPricePage'
import { StatsPlaceholderPage } from './pages/StatsPlaceholderPage'
import { readStoredAuthSession } from './stores/auth-session'

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

// 전용 페이지가 있는 경로
const intakeConversionRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/intake-conversion',
  component: IntakeConversionPage,
})

const reservationRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/reservation',
  component: ReservationPage,
})

const examListRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/exam-list',
  component: ExamListPage,
})

const cataractExamListRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/cataract-exam-list',
  component: CataractExamListPage,
})

const examinationRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/examination',
  component: ExaminationPage,
})

const consultationRateRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/consultation-rate',
  component: ConsultationRatePage,
})

const surgeryListRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/surgery-list',
  component: SurgeryListPage,
})

const surgeryRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/surgery',
  component: SurgeryPage,
})

const surgeryRatioRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/surgery-ratio',
  component: SurgeryRatioPage,
})

const overseasRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/overseas',
  component: OverseasPage,
})

const marketingRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/marketing',
  component: MarketingPage,
})

const noShowRateRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/no-show-rate',
  component: NoShowRatePage,
})

const cancelRateRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/cancel-rate',
  component: CancelRatePage,
})

const unitPriceRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/unit-price',
  component: UnitPricePage,
})

// 나머지는 플레이스홀더
const statsRoutes = statsPages
  .filter((page) =>
    !['intake-conversion', 'reservation', 'exam-list', 'cataract-exam-list', 'examination', 'consultation-rate', 'surgery-list', 'surgery', 'surgery-ratio', 'overseas', 'marketing', 'cancel-rate', 'no-show-rate', 'unit-price'].includes(
      page.id,
    ),
  )
  .map((page) =>
    createRoute({
      getParentRoute: () => authLayout,
      path: page.path,
      component: () => <StatsPlaceholderPage page={page} />,
    })
  )

// Route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  authLayout.addChildren([
    dashboardRoute,
    intakeConversionRoute,
    reservationRoute,
    examListRoute,
    cataractExamListRoute,
    examinationRoute,
    consultationRateRoute,
    surgeryListRoute,
    surgeryRoute,
    surgeryRatioRoute,
    overseasRoute,
    marketingRoute,
    cancelRateRoute,
    noShowRateRoute,
    unitPriceRoute,
    ...statsRoutes,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
