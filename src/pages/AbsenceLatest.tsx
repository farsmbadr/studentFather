import { useState, useEffect } from 'react';
import { Clock, RefreshCw, Search, UserX, Users, Pen } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';

export default function AbsenceLatest() {
  const { show, confirm } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [grouping, setGrouping] = useState<'all' | 'grade' | 'group' | 'date'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'aggregate'>('list');
  const [editReason, setEditReason] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [loadError, setLoadError] = useState('');

  const load = async (q?: string, d?: number) => {
    setLoading(true);
    setLoadError('');
    const filter = q ?? search;
    const day = d ?? daysFilter;
    try {
      const { data, error } = await supabase.from('absence_records').select('*').order('date', { ascending: false });
      if (error) { setLoadError(error.message); console.error(error); return; }
      let rows = data || [];
      if (filter.trim()) {
        const f = filter.toLowerCase();
        rows = rows.filter((r: any) => (r.student_name || '').toLowerCase().includes(f) || (r.student_code || '').toLowerCase().includes(f));
      }
      if (day === -1) {
        // custom date range
        if (dateFrom) rows = rows.filter((r: any) => r.date >= dateFrom);
        if (dateTo) rows = rows.filter((r: any) => r.date <= dateTo);
      } else if (day > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - day);
        const cutoffStr = cutoff.toLocaleDateString('en-CA');
        rows = rows.filter((r: any) => r.date >= cutoffStr);
      }
      setRecords(rows);
    } catch (e: any) {
      setLoadError(e?.message || 'خطأ غير معروف');
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [daysFilter]);

  useEffect(() => {
    if (daysFilter === -1) load();
  }, [dateFrom, dateTo]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(search, daysFilter), 300);
    return () => clearTimeout(t);
  }, [search]);

  const remove = async (id: string) => {
    const ok = await confirm('حذف هذا السجل؟');
    if (!ok) return;
    await supabase.from('absence_records').delete().eq('id', id);
    show('تم حذف السجل');
    load();
  };

  const saveReason = async (id: string) => {
    await supabase.from('absence_records').update({ reason: reasonText }).eq('id', id);
    show('تم تعديل السبب');
    setEditReason(null);
    setReasonText('');
    load();
  };

  const totalUnique = new Set(records.map(r => r.student_code)).size;

  // Aggregate by student
  const byStudent: Record<string, { count: number; grade: string; group: string }> = {};
  for (const r of records) {
    const key = r.student_name || 'غير معروف';
    if (!byStudent[key]) byStudent[key] = { count: 0, grade: r.grade || '', group: r.group_name || '' };
    byStudent[key].count++;
  }
  const sortedStudents = Object.entries(byStudent).sort((a, b) => b[1].count - a[1].count);

  // Group records
  const getDateLabel = (dateStr: string) => {
    if (!dateStr) return 'غير محدد';
    const today = new Date().toLocaleDateString('en-CA');
    if (dateStr === today) return 'اليوم';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (diff === 1) return 'أمس';
    if (diff <= 3) return `منذ ${diff} أيام`;
    return new Date(dateStr).toLocaleDateString('ar-EG');
  };

  const groupKey = grouping === 'grade' ? 'grade' : grouping === 'group' ? 'group_name' : grouping === 'date' ? 'date' : null;
  let grouped: Record<string, any[]> = groupKey
    ? records.reduce((acc: Record<string, any[]>, r: any) => {
        const g = r[groupKey] || 'غير محدد';
        if (!acc[g]) acc[g] = [];
        acc[g].push(r);
        return acc;
      }, {} as Record<string, any[]>)
    : { 'الكل': records };
  // Sort date groups chronologically (newest first)
  if (grouping === 'date') {
    const sorted = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
    grouped = Object.fromEntries(sorted);
  }

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Clock size={20} className="text-orange-500" /> آخر التسجيلات
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={daysFilter} onChange={e => {
            const v = Number(e.target.value);
            if (v === -1) {
              const to = new Date().toLocaleDateString('en-CA');
              const from = new Date(); from.setDate(from.getDate() - 30);
              setDateFrom(from.toLocaleDateString('en-CA'));
              setDateTo(to);
            }
            setDaysFilter(v);
          }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value={1}>آخر 24 ساعة</option>
            <option value={3}>آخر 3 أيام</option>
            <option value={7}>آخر 7 أيام</option>
            <option value={14}>آخر 14 يوم</option>
            <option value={30}>آخر 30 يوم</option>
            <option value={365}>آخر سنة</option>
            <option value={0}>الكل</option>
            <option value={-1}>مخصص</option>
          </select>
          {daysFilter === -1 && (
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <span className="text-gray-400 text-xs">إلى</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          )}
          <button onClick={() => load()} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><UserX size={20} className="text-red-600" /></div>
            <div><div className="text-2xl font-bold text-gray-800">{records.length}</div><div className="text-xs text-gray-500">إجمالي الغيابات</div></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Users size={20} className="text-blue-600" /></div>
            <div><div className="text-2xl font-bold text-gray-800">{totalUnique}</div><div className="text-xs text-gray-500">طلاب متغيبين</div></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock size={20} className="text-amber-600" /></div>
            <div><div className="text-2xl font-bold text-gray-800">{daysFilter === -1 ? '—' : daysFilter}</div><div className="text-xs text-gray-500">{daysFilter === -1 ? 'نطاق مخصص' : 'أيام ماضية'}</div></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><Pen size={20} className="text-purple-600" /></div>
            <div><div className="text-2xl font-bold text-gray-800">{sortedStudents[0]?.[1]?.count || 0}</div><div className="text-xs text-gray-500">أكثر طالب غيابًا</div></div>
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute right-2.5 top-2.5 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الكود..."
            className="w-full border border-gray-200 rounded-lg pr-8 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>

        {/* View mode */}
        <button onClick={() => setViewMode(v => v === 'list' ? 'aggregate' : 'list')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${viewMode === 'aggregate' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}>
          {viewMode === 'aggregate' ? 'عرض القائمة' : 'عرض الإحصائيات'}
        </button>

        {/* Grouping */}
        <select value={grouping} onChange={e => { setGrouping(e.target.value as any); setViewMode('list'); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="all">بدون تجميع</option>
          <option value="date">تجميع حسب التاريخ</option>
          <option value="grade">تجميع حسب المرحلة</option>
          <option value="group">تجميع حسب المجموعة</option>
        </select>
      </div>

      {loadError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">⚠️ {loadError}</div>}

      {loading ? <div className="text-center text-gray-400 py-20">جاري التحميل...</div> : viewMode === 'aggregate' ? (
        /* Aggregate view: most absent students */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b bg-orange-50">
            <span className="font-bold text-sm text-orange-800">الأكثر غيابًا{daysFilter === -1 ? '' : daysFilter === 0 ? ' (الكل)' : ` في آخر ${daysFilter} يوم`}</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {sortedStudents.map(([name, info], i) => (
              <div key={name} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i < 3 ? 'bg-red-500' : 'bg-gray-300'}`}>{i + 1}</span>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{name}</div>
                    <div className="text-xs text-gray-400">{info.grade} {info.group ? `| ${info.group}` : ''}</div>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">{info.count} غياب{info.count !== 1 ? 'ات' : ''}</span>
              </div>
            ))}
            {!sortedStudents.length && <div className="py-8 text-center text-gray-300 text-sm">لا توجد بيانات</div>}
          </div>
        </div>
      ) : (
        /* List view */
        Object.entries(grouped).map(([groupName, groupRecords]: [string, any[]]) => (
          <div key={groupName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {(grouping === 'grade' || grouping === 'group' || grouping === 'date') && (
              <div className="px-5 py-3 bg-orange-50 border-b border-orange-100">
                <span className="font-bold text-sm text-orange-800">{grouping === 'date' ? getDateLabel(groupName) : groupName}</span>
                <span className="text-xs text-orange-600 mr-2">({(groupRecords as any[]).length} سجل{(groupRecords as any[]).length !== 1 ? 'ات' : ''})</span>
              </div>
            )}
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {(groupRecords as any[]).map((r: any) => (
                <div key={r.id} className={`flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors ${r.date === new Date().toLocaleDateString('en-CA') ? 'bg-amber-50/60' : ''}`}>
                  <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                    <span className="font-semibold text-gray-800 text-sm min-w-24 truncate">{r.student_name}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded shrink-0">{r.student_code}</span>
                    <span className="text-xs text-gray-400 shrink-0">{r.grade || '—'}</span>
                    <span className="text-xs text-gray-500 shrink-0">{r.group_name || '—'}</span>
                    <span className="text-xs text-gray-400 shrink-0">{r.date ? new Date(r.date).toLocaleDateString('ar-EG') : '—'}</span>
                    {editReason === r.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <input type="text" value={reasonText} onChange={e => setReasonText(e.target.value)}
                          className="w-28 border border-orange-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400" autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveReason(r.id); if (e.key === 'Escape') setEditReason(null); }} />
                        <button onClick={() => saveReason(r.id)} className="text-xs text-green-600 hover:text-green-700 font-semibold">حفظ</button>
                        <button onClick={() => setEditReason(null)} className="text-xs text-gray-400 hover:text-gray-600">إلغاء</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditReason(r.id); setReasonText(r.reason || ''); }}
                        className={`text-xs shrink-0 px-2 py-0.5 rounded border transition-colors ${r.reason ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 'text-gray-300 border-dashed border-gray-200 hover:text-gray-500 hover:border-gray-300'}`}>
                        {r.reason || 'إضافة سبب'}
                      </button>
                    )}
                  </div>
                  <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-600 transition-colors text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 shrink-0 mr-2">حذف</button>
                </div>
              ))}
              {!(groupRecords as any[]).length && <div className="py-8 text-center text-gray-300 text-sm">لا توجد سجلات</div>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
