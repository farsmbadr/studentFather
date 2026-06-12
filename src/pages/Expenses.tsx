import { useState, useEffect, useRef } from 'react';
import { Plus, X, Receipt, Edit2, Archive, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';
import { getCurrentUser } from '../auth';
import { printHeaderHtml, printHeaderStyle } from '../utils/printHeader';

const categories = ['إيجار', 'مرتبات', 'فواتير', 'صيانة', 'نقل', 'دعاية', 'أخرى'];

function Modal({ onClose, onSave, initial }: { onClose: () => void; onSave: (d: any) => void; initial?: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: initial?.title || '',
    amount: initial?.amount || 0,
    category: initial?.category || 'أخرى',
    date: initial?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    notes: initial?.notes || '',
    created_by: initial?.created_by || getCurrentUser().name,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);
  useEffect(() => { supabase.from('app_users').select('*').order('name').then(({ data }) => setUsers(data || [])); }, []);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Receipt size={18} className="text-red-500" /> {initial ? 'تعديل مصروف' : 'إضافة مصروف'}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">البيان <span className="text-red-500">*</span></label>
            <input ref={inputRef} value={form.title} onChange={e => set('title', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المبلغ <span className="text-red-500">*</span></label>
            <input type="number" value={form.amount || ''} onChange={e => set('amount', parseFloat(e.target.value) || 0)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">التصنيف</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">التاريخ</label>
            <input type="date" value={(form.date || '').slice(0, 10)} onChange={e => set('date', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المستخدم</label>
            <select value={form.created_by} onChange={e => set('created_by', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
              {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ملاحظات</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
          </div>
        </div>
        <div className="flex gap-3 justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.title || !form.amount}
            className="px-5 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50">{initial ? 'تحديث' : 'حفظ'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Expenses() {
  const { show } = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(undefined);
  const [search, setSearch] = useState('');
  const [center, setCenter] = useState<any>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    setExpenses((data || []).filter((e: any) => !e.is_archived));
    supabase.from('center_config').select('*').maybeSingle().then(({ data: c }) => { if (c) setCenter(c); });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (form: any) => {
    try {
      if (editing) {
        await supabase.from('expenses').update(form).eq('id', editing.id);
        show('تم تحديث المصروف');
      } else {
        const user = getCurrentUser();
        await supabase.from('expenses').insert({ ...form, created_by: user.name });
        show('تم إضافة المصروف');
      }
      setShowModal(false); setEditing(undefined); load();
    } catch { show('حدث خطأ', 'error'); }
  };

  const archive = async (id: string) => {
    await supabase.from('expenses').update({ is_archived: true }).eq('id', id);
    show('تم أرشفة المصروف');
    load();
  };

  const filtered = expenses.filter(e => e.title?.includes(search) || e.category?.includes(search) || String(e.amount).includes(search));

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const fmt = (n: number | string) => Math.round(Number(n));

  const printExpenses = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>المصروفات</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;font-family:Tahoma,Arial,sans-serif;}
      body{padding:20px;padding-top:45px;padding-bottom:35px;color:#333;font-size:12px;}
      ${printHeaderStyle()}
      h3{text-align:center;color:#c0392b;margin-bottom:15px;}
      table{width:100%;border-collapse:collapse;margin-top:10px;}
      th{background:#c0392b;color:#fff;padding:7px 5px;font-size:11px;text-align:center;}
      td{padding:5px;text-align:center;border-bottom:1px solid #eee;font-size:11px;}
      tr:nth-child(even){background:#f9f9f9;}
      .total{text-align:center;font-size:14px;margin-top:12px;color:#666;font-weight:bold;}
    </style></head><body>
    ${printHeaderHtml(center)}
    <h3>تقرير المصروفات والإهلاكات</h3>
    <table><thead><tr><th>#</th><th>البيان</th><th>المبلغ</th><th>التصنيف</th><th>التاريخ</th><th>المستخدم</th></tr></thead><tbody>
    ${filtered.map((e: any, i: number) => `<tr><td>${i + 1}</td><td>${e.title}</td><td>${fmt(e.amount)} ج</td><td>${e.category}</td><td>${(e.date || '').slice(0, 10)}</td><td>${e.created_by || '—'}</td></tr>`).join('')}
    </tbody></table>
    <p class="total">الإجمالي: ${fmt(total)} ج</p>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="fade-in space-y-4">
      {showModal && <Modal onClose={() => { setShowModal(false); setEditing(undefined); }} onSave={save} initial={editing} />}

      <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <Receipt size={24} />
          <span className="text-lg text-white/80">إجمالى المصروفات</span>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold mr-auto">{expenses.length} معاملة</span>
        </div>
        <p className="text-2xl font-bold mt-1">{fmt(total)} ج</p>
      </div>

      <ListTemplate
        title="المصروفات والإهلاكات"
        data={filtered}
        keyExtractor={e => e.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالبيان أو التصنيف..."
        loading={loading}
        emptyMessage="لا توجد مصروفات"
        emptyIcon={<Receipt size={40} className="mx-auto text-gray-300" />}
        onAdd={() => { setEditing(undefined); setShowModal(true); }}
        onPrint={printExpenses}
        onRefresh={load}
        columns={[
          { key: 'index', label: '#', render: (_, i) => <span className="text-gray-500 font-mono">{i + 1}</span> },
          { key: 'title', label: 'البيان', render: e => <span className="font-semibold text-gray-800">{e.title}</span> },
          { key: 'amount', label: 'المبلغ', render: e => <span className="font-bold text-red-600">{fmt(e.amount)} ج</span> },
          { key: 'category', label: 'التصنيف', render: e => <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">{e.category}</span> },
          { key: 'date', label: 'التاريخ', render: e => <span className="text-gray-500 text-xs">{e.date?.slice(0, 10)}</span> },
          { key: 'created_by', label: 'المستخدم', render: e => <span className="text-gray-500 text-xs">{e.created_by || '—'}</span> },
          { key: 'notes', label: 'ملاحظات', render: e => <span className="text-gray-500 text-xs max-w-[150px] truncate block">{e.notes || '—'}</span> },
          {
            key: 'actions', label: 'إجراءات', sortable: false, render: e => (
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditing(e); setShowModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="تعديل"><Edit2 size={14} /></button>
                <button onClick={() => archive(e.id)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg" title="أرشفة"><Archive size={14} /></button>

              </div>
            )
          },
        ]}
      />
    </div>
  );
}
