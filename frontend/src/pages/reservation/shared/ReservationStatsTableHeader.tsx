import type { ReactNode } from 'react'

type StatsHeaderColumn = {
  key: PropertyKey
  label: string
}

export type StatsHeaderNode<TColumn extends StatsHeaderColumn> =
  | {
      kind: 'group'
      label: string
      className: string
      children: readonly StatsHeaderNode<TColumn>[]
    }
  | {
      kind: 'leaf'
      column: TColumn
      className: string
    }

export type StatsHeaderStandaloneCell = {
  key: string
  content: ReactNode
  className: string
}

export type StatsHeaderModel<TColumn extends StatsHeaderColumn> = {
  corner: {
    content: ReactNode
    className: string
  }
  leadingCells?: readonly StatsHeaderStandaloneCell[]
  nodes: readonly StatsHeaderNode<TColumn>[]
}

export type StatsTableHeaderClasses = {
  groupHead: string
  headH: string
  headBottom: string
  stickyCorner: string
  stickyRows: readonly string[]
  leftDivider: string
}

type HeaderCell = {
  key: string
  content: ReactNode
  colSpan?: number
  rowSpan?: number
  className: string
}

const leafCount = <TColumn extends StatsHeaderColumn>(node: StatsHeaderNode<TColumn>): number => {
  if (node.kind === 'leaf') return 1
  return node.children.reduce((total, child) => total + leafCount(child), 0)
}

const headerDepth = <TColumn extends StatsHeaderColumn>(node: StatsHeaderNode<TColumn>): number => {
  if (node.kind === 'leaf') return 1
  return 1 + Math.max(...node.children.map(headerDepth))
}

function buildHeaderRows<TColumn extends StatsHeaderColumn>(
  nodes: readonly StatsHeaderNode<TColumn>[],
  maxDepth: number,
  classes: StatsTableHeaderClasses,
  renderLabel: (label: string) => ReactNode,
): HeaderCell[][] {
  const rows: HeaderCell[][] = Array.from({ length: maxDepth }, () => [])

  const visit = (node: StatsHeaderNode<TColumn>, depth: number, path: string) => {
    if (node.kind === 'group') {
      rows[depth].push({
        key: `${path}:${node.label}`,
        content: node.label,
        colSpan: leafCount(node),
        className: `${classes.groupHead} ${classes.stickyRows[depth]} ${classes.headH} ${node.className}`,
      })
      node.children.forEach((child, index) => visit(child, depth + 1, `${path}.${index}`))
      return
    }

    rows[depth].push({
      key: `${path}:${String(node.column.key)}`,
      content: renderLabel(node.column.label),
      rowSpan: maxDepth - depth,
      className: `${classes.groupHead} ${classes.stickyRows[depth]} ${classes.headBottom} ${node.className}`,
    })
  }

  nodes.forEach((node, index) => visit(node, 0, `${index}`))

  return rows
}

export function ReservationStatsTableHeader<TColumn extends StatsHeaderColumn>({
  model,
  classes,
  renderLabel,
}: {
  model: StatsHeaderModel<TColumn>
  classes: StatsTableHeaderClasses
  renderLabel: (label: string) => ReactNode
}) {
  const maxDepth = Math.max(...model.nodes.map(headerDepth))
  const rows = buildHeaderRows(model.nodes, maxDepth, classes, renderLabel)

  return (
    <thead>
      {rows.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {rowIndex === 0 ? (
            <>
              <th
                rowSpan={maxDepth}
                className={`${classes.groupHead} ${classes.leftDivider} ${classes.headBottom} ${classes.stickyCorner} ${model.corner.className}`}
              >
                {model.corner.content}
              </th>
              {model.leadingCells?.map((cell) => (
                <th
                  key={cell.key}
                  rowSpan={maxDepth}
                  className={`${classes.groupHead} ${classes.stickyRows[0]} ${classes.headBottom} ${cell.className}`}
                >
                  {cell.content}
                </th>
              ))}
            </>
          ) : null}
          {row.map((cell) => (
            <th key={cell.key} colSpan={cell.colSpan} rowSpan={cell.rowSpan} className={cell.className}>
              {cell.content}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  )
}
