import { z } from 'zod'

/** 공통 응답 래퍼: { success, data } */
export function apiResponseOf<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({ success: z.boolean(), data: itemSchema })
}
