import { z } from 'zod'

/** 공통 응답 래퍼: { success, data } */
export function apiResponseOf<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({ success: z.boolean(), data: itemSchema })
}

type QueryValue = string | number | boolean | Array<string | number | boolean> | null | undefined

export const buildQuery = (params: Record<string, QueryValue>): string => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value))
  })

  return searchParams.toString()
}

export const withQuery = (path: string, params: Record<string, QueryValue>) => {
  const query = buildQuery(params)
  return query ? `${path}?${query}` : path
}
