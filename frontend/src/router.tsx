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
import { WeeklyReportPage } from './pages/ReportPage'
import { MonthlyReportPage } from './pages/MonthlyReportPage'
import { OverallExamPage } from './pages/OverallExamPage'
import { OverallExamWeeklyPage } from './pages/OverallExamWeeklyPage'
import { IntakeConversionPage } from './pages/IntakeConversionPage'
import { ReservationPage } from './pages/ReservationPage'
import { ReservationOverallPage } from './pages/ReservationOverallPage'
import { ReservationListPage } from './pages/ReservationListPage'
import { ExaminationPage } from './pages/ExaminationPage'
import { ExaminationVisionPage } from './pages/ExaminationVisionPage'
import { ExaminationDreamlensPage } from './pages/ExaminationDreamlensPage'
import { ProcedureExamPage } from './pages/ProcedureExamPage'
import { ExamListPage } from './pages/ExamListPage'
import { CataractExamListPage } from './pages/CataractExamListPage'
import { ConsultationRatePage } from './pages/ConsultationRatePage'
import { CataractReservationRatePage } from './pages/CataractReservationRatePage'
import { StopReasonPage } from './pages/StopReasonPage'
import { SurgeryListPage } from './pages/SurgeryListPage'
import { SurgeryPage } from './pages/SurgeryPage'
import { SurgeryRatioPage } from './pages/SurgeryRatioPage'
import { SurgeryCompositionPage } from './pages/SurgeryCompositionPage'
import { OutpatientCountPage } from './pages/OutpatientCountPage'
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

// Report
const weeklyReportRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/report/weekly',
  component: WeeklyReportPage,
})

const monthlyReportRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/report/monthly',
  component: MonthlyReportPage,
})

// 전용 페이지가 있는 경로
const overallExamRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/overall-exam',
  component: OverallExamPage,
})

const overallExamWeeklyRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/overall-exam-weekly',
  component: OverallExamWeeklyPage,
})

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

const reservationOverallRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/reservation-overall',
  component: ReservationOverallPage,
})

const reservationListRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/reservation-list',
  component: ReservationListPage,
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

const examinationVisionRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/examination/vision',
  component: ExaminationVisionPage,
})

const examinationDreamlensRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/examination/dreamlens',
  component: ExaminationDreamlensPage,
})

const procedureExamRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/procedure-exam',
  component: ProcedureExamPage,
})

const consultationRateRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/consultation-rate',
  component: ConsultationRatePage,
})

const cataractReservationRateRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/cataract-reservation-rate',
  component: CataractReservationRatePage,
})

const stopReasonRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/stop-reason',
  component: StopReasonPage,
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

const surgeryCompositionRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/surgery-composition',
  component: SurgeryCompositionPage,
})

const outpatientCountRoute = createRoute({
  getParentRoute: () => authLayout,
  path: '/stats/outpatient-count',
  component: OutpatientCountPage,
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
    !['weekly-report', 'monthly-report', 'overall-exam', 'overall-exam-weekly', 'intake-conversion', 'reservation', 'reservation-overall', 'reservation-list', 'exam-list', 'cataract-exam-list', 'examination', 'examination-vision', 'examination-dreamlens', 'procedure-exam', 'consultation-rate', 'cataract-reservation-rate', 'stop-reason', 'surgery-list', 'surgery', 'surgery-ratio', 'surgery-composition', 'outpatient-count', 'overseas', 'marketing', 'cancel-rate', 'no-show-rate', 'unit-price'].includes(
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
    weeklyReportRoute,
    monthlyReportRoute,
    overallExamRoute,
    overallExamWeeklyRoute,
    intakeConversionRoute,
    reservationRoute,
    reservationOverallRoute,
    reservationListRoute,
    examListRoute,
    cataractExamListRoute,
    examinationRoute,
    examinationVisionRoute,
    examinationDreamlensRoute,
    procedureExamRoute,
    consultationRateRoute,
    cataractReservationRateRoute,
    stopReasonRoute,
    surgeryListRoute,
    surgeryRoute,
    surgeryRatioRoute,
    surgeryCompositionRoute,
    outpatientCountRoute,
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
