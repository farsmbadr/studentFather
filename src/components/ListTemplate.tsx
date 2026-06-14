import { useState, useMemo, useRef, useEffect, ReactNode, useCallback } from 'react';
import { Search, Plus, FileDown, Printer, RefreshCw, ChevronUp, ChevronDown, ChevronLeft } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render: (item: T, index: number) => ReactNode;
}

interface HeaderDropdownItem {
  label: string;
  onClick: () => void;
}

interface HeaderButton {
  label: string;
  icon: ReactNode;
  color: string;
  hoverColor?: string;
  onClick?: () => void;
  dropdownItems?: HeaderDropdownItem[];
}

interface ListTemplateProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  keyExtractor: (item: T) => string;
  onAdd?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  onRefresh?: () => void;
  extraButtons?: HeaderButton[];
  filters?: ReactNode;
}

export default function ListTemplate<T>({
  title,
  data,
  columns,
  searchPlaceholder = 'بحث...',
  searchValue,
  onSearchChange,
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  emptyIcon,
  keyExtractor,
  onAdd,
  onPrint,
  onRefresh,
  extraButtons,
  filters,
}: ListTemplateProps<T>) {
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      dropdownRefs.current.forEach((ref, i) => {
        if (ref && !ref.contains(e.target as Node)) {
          if (openDropdown === i) setOpenDropdown(null);
        }
      });
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal), 'ar');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const handleExport = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = sorted.map(item => {
        const row: Record<string, any> = {};
        columns.forEach(col => {
          const val = (item as any)[col.key];
          row[col.label] = val ?? '';
        });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, `${title}.xlsx`);
    } catch { }
  }, [sorted, columns, title]);

  return (
    <div className="fade-in space-y-4">
      <div className="bg-white rounded-2xl shadow p-5 flex flex-col" style={{ minHeight: 'calc(100vh - 250px)' }}>
        <div className="flex items-center justify-between mb-5 no-print">
          <h2 className="font-bold text-gray-800">{title}</h2>
        </div>

        <div className="flex items-center gap-3 mb-5 pb-5 border-b no-print">
          <div className="relative w-1/4">
            <input
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 pr-10"
            />
            <Search size={16} className="absolute right-3 top-3 text-gray-400" />
          </div>
          <div className="flex items-center gap-2 mr-auto">
            {filters}
            {onAdd && (
              <button onClick={onAdd} className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors">
                <Plus size={16} /> إضافة
              </button>
            )}
            <button onClick={handleExport} className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors">
              <FileDown size={16} /> تصدير إكسيل
            </button>
            {onPrint && (
              <button onClick={onPrint} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors">
                <Printer size={16} /> طباعة
              </button>
            )}
            {onRefresh && (
              <button onClick={onRefresh} className="flex items-center gap-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors">
                <RefreshCw size={16} /> تحديث
              </button>
            )}
            {extraButtons?.map((btn, i) => (
              <div key={i} ref={el => { dropdownRefs.current[i] = el; }} className="relative">
                <button
                  onClick={() => {
                    if (btn.dropdownItems) setOpenDropdown(openDropdown === i ? null : i);
                    else btn.onClick?.();
                  }}
                  className={`flex items-center gap-1.5 ${btn.color} ${btn.hoverColor || 'hover:opacity-90'} text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors`}>
                  {btn.icon} {btn.label} {btn.dropdownItems && <ChevronLeft size={14} />}
                </button>
                {btn.dropdownItems && openDropdown === i && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 min-w-40 py-1">
                    {btn.dropdownItems.map((item, j) => (
                      <button key={j} onClick={() => { item.onClick(); setOpenDropdown(null); }}
                        className="block w-full text-right px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12">
            {emptyIcon}
            <p className="text-gray-400 text-sm mt-3">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    {columns.map(col => (
                      <th
                        key={col.key}
                        onClick={() => col.sortable !== false && handleSort(col.key)}
                        className={`px-3 py-2.5 text-right font-semibold ${col.sortable !== false ? 'cursor-pointer hover:text-gray-700 select-none' : ''}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.sortable !== false && sortKey === col.key && (
                            sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((item, idx) => (
                    <tr key={keyExtractor(item)} className="table-row-hover transition-colors">
                      {columns.map(col => (
                        <td key={col.key} className="px-3 py-3">{col.render(item, idx)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t mt-4 text-sm no-print">
              <span className="text-gray-600">
                إجمالي: <strong className="text-gray-800">{sorted.length}</strong> مدخلات
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
