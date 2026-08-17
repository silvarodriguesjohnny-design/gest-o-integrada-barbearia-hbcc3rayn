import { type ReactNode } from 'react'

interface Column<T> {
  key: string
  header: ReactNode
  render?: (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  empty?: ReactNode
  rowKey: (row: T) => string
}

export function Table<T>({ columns, data, empty, rowKey }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))]">
      <table className="w-full text-sm">
        <thead className="bg-[hsl(var(--muted))]">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 text-left font-semibold text-[hsl(var(--foreground))] ${c.className ?? ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-[hsl(var(--muted-foreground))]"
              >
                {empty ?? 'Nenhum registro encontrado.'}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/40"
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-top ${c.className ?? ''}`}>
                    {c.render ? c.render(row) : (row as any)[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
