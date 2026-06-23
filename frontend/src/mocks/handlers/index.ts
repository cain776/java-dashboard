import { authHandlers } from './auth'
import { consultationHandlers } from './consultation'
import { examHandlers } from './exam'
import { reservationHandlers } from './reservation'
import { surgeryHandlers } from './surgery'

export const handlers = [
  ...authHandlers,
  ...reservationHandlers,
  ...surgeryHandlers,
  ...consultationHandlers,
  ...examHandlers,
]
