import { X } from 'lucide-react'
import { CHIP_STYLES } from '@/constants/chart'

export function PeriodChip({ label, index, isBase, onRemove }: {
  label: string
  index: number
  isBase: boolean
  onRemove?: () => void
}) {
  return (
    <span className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium ${CHIP_STYLES[index] ?? CHIP_STYLES[0]}`}>
      {isBase && (
        <span className="rounded bg-current/10 px-1.5 py-0.5 text-xs opacity-70">기준</span>
      )}
      {label}
      {onRemove && (
        <button
          type="button"
          title={`${label} 삭제`}
          onClick={onRemove}
          className="hover:opacity-60 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  )
}
