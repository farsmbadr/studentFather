import { useState, useEffect, useRef } from 'react';
import { Plus, X, DollarSign, Archive, Search, CalendarRange, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';

function Modal({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({ student_name: '', amount: 0, received_by: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><DollarSign size={18} className="text-green-500" /> إضافة إيراد</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">اسم الطالب <span className="text-red-500">*</span></label>
            <input ref={inputRef} value={form.student_name} onChange={e => set('student_name', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المبلغ <span className="text-red-500">*</span></label>
            <input type="number" value={form.amount || ''} onChange={e => set('amount', parseFloat(e.target.value) || 0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المستلم</label>
            <input value={form.received_by} onChange={e => set('received_by', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">التاريخ</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ملاحظات</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>
        <div className="flex gap-3 justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.student_name || !form.amount}
            className="px-5 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}

export default function Revenues() {
  const { show, confirm } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(monthEnd);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('payments').select('*').order('date', { ascending: false });
    setPayments(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (form: any) => {
    try {
      await supabase.from('payments').insert({ ...form, date: form.date || new Date().toISOString().slice(0, 10) });
      show('تم إضافة الإيراد');
      setShowModal(false); load();
    } catch { show('حدث خطأ', 'error'); }
  };

  const archiveItem = async (id: string) => {
    const ok = await confirm('نقل هذا الإيراد للأرشيف؟');
    if (!ok) return;
    await supabase.from('payments').update({ is_archived: true }).eq('id', id);
    show('تم نقل الإيراد للأرشيف');
    load();
  };

  const filtered = payments.filter(p => {
    if (p.is_archived) return false;
    const d = p.date?.slice(0, 10);
    const matchesSearch = p.student_name?.includes(search) || String(p.amount).includes(search);
    const matchesDate = (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
    return matchesSearch && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  const totalAmount = filtered.reduce((s, p) => s + Number(p.amount), 0);

  const resetFilters = () => {
    setDateFrom(''); setDateTo(''); setSearch(''); setPage(1);
  };
  const hasFilters = dateFrom || dateTo || search;

  return (
    <div className="fade-in space-y-4">
      {showModal && <Modal onClose={() => setShowModal(false)} onSave={save} />}

      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <DollarSign size={24} />
          <span className="text-lg text-white/80">إجمالى الإيرادات (حسب الفلتر)</span>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold mr-auto">{filtered.length} معاملة</span>
        </div>
        <p className="text-2xl font-bold mt-1">{totalAmount.toFixed(2)} ج</p>
      </div>

      {/* Date filter + per page */}
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarRange size={15} className="text-gray-400" />
            <span className="text-xs text-gray-500 font-semibold">من</span>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-green-400" />
            <span className="text-xs text-gray-500 font-semibold">إلى</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-xs text-gray-500 font-semibold">عرض</span>
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs text-gray-500">لكل صفحة</span>
          </div>
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5">مسح الفلترة</button>
          )}
        </div>
      </div>

      <ListTemplate
        title="الإيرادات"
        data={paged}
        keyExtractor={p => p.id}
        searchValue={search}
        onSearchChange={v => { setSearch(v); setPage(1); }}
        searchPlaceholder="بحث باسم الطالب أو المبلغ..."
        loading={loading}
        emptyMessage="لا توجد إيرادات مسجلة"
        emptyIcon={<DollarSign size={40} className="mx-auto text-gray-300" />}
        onAdd={() => setShowModal(true)}
        onRefresh={load}
        columns={[
          { key: 'student_name', label: 'الطالب', render: p => <span className="font-semibold text-gray-800">{p.student_name || '—'}</span> },
          { key: 'amount', label: 'المبلغ', render: p => <span className="font-bold text-green-600">{Number(p.amount).toFixed(2)} ج</span> },
          { key: 'date', label: 'التاريخ', render: p => <span className="text-gray-500 text-xs">{p.date?.slice(0, 10)}</span> },
          { key: 'received_by', label: 'المستلم', render: p => <span className="text-gray-500">{p.received_by || '—'}</span> },
          { key: 'notes', label: 'ملاحظات', render: p => <span className="text-gray-400 text-xs">{p.notes || '—'}</span> },
          {
            key: 'actions', label: 'إجراءات', sortable: false, render: p => (
              <button onClick={() => archiveItem(p.id)} className="text-purple-400 hover:text-purple-600 p-1 rounded-lg hover:bg-purple-50 transition-colors" title="نقل للأرشيف"><Archive size={14} /></button>
            )
          },
        ]}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 bg-white rounded-2xl shadow p-3 border border-gray-100">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} className="text-gray-600" /></button>
          <span className="text-sm text-gray-600">
            الصفحة <span className="font-bold text-gray-800">{safePage}</span> من {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} className="text-gray-600" /></button>
        </div>
      )}
    </div>
  );
}
