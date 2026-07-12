import React from "react";

export interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  emptyState?: React.ReactNode;
  className?: string;
}

/**
 * DataTable — Premium VADL V2 table component.
 * Uses ultra-subtle borders (black/5) and a premium typography hierarchy.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  className = "",
}: DataTableProps<T>) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black/5 dark:border-white/5">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                style={col.width ? { width: col.width } : undefined}
                className={`py-4 px-5 text-[12px] font-sans font-[600] text-[#838383] uppercase tracking-widest ${alignClass[col.align ?? "left"]}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            emptyState ? (
              <tr>
                <td colSpan={columns.length} className="py-20 text-center text-[14px] font-sans font-medium text-[#838383]">
                  {emptyState}
                </td>
              </tr>
            ) : null
          ) : (
            data.map((row, i) => (
              <tr
                key={keyExtractor(row, i)}
                className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors group"
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`py-4.5 px-5 text-[14px] font-sans font-[500] text-t-primary ${alignClass[col.align ?? "left"]}`}
                  >
                    {col.render
                      ? col.render(row, i)
                      : String((row as Record<string, unknown>)[String(col.key)] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
