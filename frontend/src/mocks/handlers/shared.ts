export const parseYears = (request: Request): number[] => {
  const url = new URL(request.url)
  const years = (url.searchParams.get('years') ?? '').split(',').map(Number).filter(Boolean)
  if (!years.length) years.push(new Date().getFullYear())
  return years
}

const pad = (value: number) => String(value).padStart(2, '0')

export const formatDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const createDateRange = (from: string, to: string) => {
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      return formatDate(date)
    })
  }

  const dates: string[] = []
  const cursor = new Date(start)

  while (cursor <= end) {
    dates.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}
