import { authHandlers } from './auth'
import { consultationHandlers } from './consultation'
import { etcHandlers } from './etc'
import { examHandlers } from './exam'
import { outpatientHandlers } from './outpatient'
import { overallHandlers } from './overall'
import { reservationHandlers } from './reservation'
import { surgeryHandlers } from './surgery'

export const handlers = [
  ...authHandlers,
  ...reservationHandlers,
  ...surgeryHandlers,
  ...consultationHandlers,
  ...examHandlers,
  ...outpatientHandlers,
  ...overallHandlers,
  ...etcHandlers,
]
