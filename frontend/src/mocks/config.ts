const truthyValues = new Set(['1', 'true', 'yes', 'on'])

export function isMockServerEnabled(flag?: string): boolean {
  if (!flag) {
    return false
  }

  return truthyValues.has(flag.trim().toLowerCase())
}
