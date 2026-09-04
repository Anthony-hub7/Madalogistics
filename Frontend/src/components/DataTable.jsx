export default function DataTable({ columns, data, onRowClick }) {
  return (
    <div className="waybill-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead className="bg-surface-light border-b border-outline-variant">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3.5 font-display text-xs uppercase tracking-widest font-bold text-on-surface-variant ${col.align === 'right' ? 'text-right' : ''} ${col.hidden || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40 bg-surface">
            {data.map((row, i) => (
              <tr
                key={row.id || i}
                onClick={() => onRowClick?.(row)}
                className="transition-colors hover:bg-surface-light/70 group cursor-pointer"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-4 text-sm font-body text-on-surface ${col.align === 'right' ? 'text-right' : ''} ${col.hidden || ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
