'use client';

import { memo } from 'react';

export interface Column {
  key: string;
  label: string;
  labelAr: string;
  render?: (value: any, row: any) => React.ReactNode;
  hideOnMobile?: boolean;
  align?: 'start' | 'end' | 'center';
}

export interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  isRTL?: boolean;
  keyField?: string;
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  emptyMessageAr?: string;
  actions?: (row: any) => React.ReactNode;
}

const ResponsiveTable = memo(function ResponsiveTable({
  columns,
  data,
  loading = false,
  isRTL = false,
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No data',
  emptyMessageAr = 'لا توجد بيانات',
  actions,
}: ResponsiveTableProps) {

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 bg-gray-100 dark:bg-gray-800
              rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        {isRTL ? emptyMessageAr : emptyMessage}
      </div>
    );
  }

  const visibleColumns = columns.filter(col => !col.hideOnMobile);

  return (
    <>
      {/* ── Desktop: جدول عادي ── */}
      <div className="hidden md:block bg-white dark:bg-gray-900
        rounded-xl border border-gray-200 dark:border-gray-700
        overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800
              border-b border-gray-200 dark:border-gray-700">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-medium
                      text-gray-600 dark:text-gray-400
                      text-${col.align ?? 'start'}`}
                  >
                    {isRTL ? col.labelAr : col.label}
                  </th>
                ))}
                {actions && (
                  <th className="px-4 py-3 font-medium
                    text-gray-600 dark:text-gray-400 text-center">
                    {isRTL ? 'إجراءات' : 'Actions'}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map(row => (
                <tr
                  key={row[keyField]}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800/50
                    transition-colors
                    ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-4 py-3
                        text-gray-800 dark:text-gray-200
                        text-${col.align ?? 'start'}`}
                    >
                      {col.render
                        ? col.render!(row[col.key], row)
                        : (row[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-center">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile: بطاقات ── */}
      <div className="md:hidden space-y-3">
        {data.map(row => (
          <div
            key={row[keyField]}
            onClick={() => onRowClick?.(row)}
            className={`bg-white dark:bg-gray-900 rounded-xl
              border border-gray-200 dark:border-gray-700 p-4
              transition-colors active:bg-gray-50
              ${onRowClick ? 'cursor-pointer' : ''}`}
          >
            {/* السطر الأول — عنوان + آخر column */}
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                {/* Column الأول — العنوان الرئيسي */}
                <p className="font-medium text-gray-900 dark:text-white
                  truncate">
                  {columns[0]?.render
                    ? columns[0].render!(row[columns[0].key], row)
                    : (row[columns[0]?.key] ?? '—')}
                </p>
                {/* Column الثاني — subtitle */}
                {columns[1] && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {columns[1].render
                      ? columns[1].render!(row[columns[1].key], row)
                      : (row[columns[1].key] ?? '—')}
                  </p>
                )}
              </div>

              {/* آخر column — status أو مبلغ */}
              {columns.length > 2 && (
                <div className="flex-shrink-0">
                  {columns[columns.length - 1]?.render
                    ? columns[columns.length - 1].render!(
                        row[columns[columns.length - 1].key], row)
                    : (row[columns[columns.length - 1]?.key] ?? '—')}
                </div>
              )}
            </div>

            {/* باقي الـ columns */}
            {visibleColumns.length > 2 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm
                border-t border-gray-100 dark:border-gray-800 pt-3">
                {visibleColumns.slice(2, -1).map(col => (
                  <div key={col.key}>
                    <span className="text-xs text-gray-400
                      dark:text-gray-500 block">
                      {isRTL ? col.labelAr : col.label}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {col.render
                        ? col.render!(row[col.key], row)
                        : (row[col.key] ?? '—')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* الإجراءات */}
            {actions && (
              <div className="mt-3 pt-3 border-t border-gray-100
                dark:border-gray-800 flex justify-end gap-2">
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
});

export default ResponsiveTable;
